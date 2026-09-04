package com.devopssuite.ide.service;

import com.devopssuite.ide.dto.IdeFileDto.*;
import com.devopssuite.ide.model.IdeFile;
import com.devopssuite.ide.repository.IdeFileRepository;
import com.devopssuite.project.model.Project;
import com.devopssuite.project.repository.ProjectMemberRepository;
import com.devopssuite.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Business logic for IDE file CRUD operations.
 *
 * <p>Access rules:
 * <ul>
 *   <li>A user can read/write files in a project if they are the project owner
 *       <em>or</em> an active project member (any role).</li>
 *   <li>Only the file owner or the project owner can delete a file.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IdeFileService {

    private final IdeFileRepository fileRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;

    // ── Extension → Monaco language id ──────────────────────────────────────────

    private static final Map<String, String> EXT_TO_LANG = Map.ofEntries(
            Map.entry("py",   "python"),
            Map.entry("js",   "javascript"),
            Map.entry("mjs",  "javascript"),
            Map.entry("cjs",  "javascript"),
            Map.entry("ts",   "typescript"),
            Map.entry("tsx",  "typescript"),
            Map.entry("jsx",  "javascript"),
            Map.entry("java", "java"),
            Map.entry("cpp",  "cpp"),
            Map.entry("cc",   "cpp"),
            Map.entry("cxx",  "cpp"),
            Map.entry("c",    "c"),
            Map.entry("h",    "cpp"),
            Map.entry("go",   "go"),
            Map.entry("rb",   "ruby"),
            Map.entry("rs",   "rust"),
            Map.entry("sh",   "shell"),
            Map.entry("bash", "shell"),
            Map.entry("json", "json"),
            Map.entry("yaml", "yaml"),
            Map.entry("yml",  "yaml"),
            Map.entry("xml",  "xml"),
            Map.entry("html", "html"),
            Map.entry("css",  "css"),
            Map.entry("md",   "markdown"),
            Map.entry("txt",  "plaintext")
    );

    // ── List ─────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<FileListItem> listFiles(UUID projectId, UUID requestingUserId) {
        assertProjectAccess(projectId, requestingUserId);
        return fileRepository
                .findByProjectIdOrderByIsFolderDescPathAsc(projectId)
                .stream()
                .map(this::toListItem)
                .toList();
    }

    // ── Get ──────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public FileDetail getFile(UUID fileId, UUID requestingUserId) {
        IdeFile file = loadFile(fileId);
        assertProjectAccess(file.getProjectId(), requestingUserId);
        return toDetail(file);
    }

    // ── Create ───────────────────────────────────────────────────────────────────

    @Transactional
    public FileDetail createFile(CreateRequest req, UUID requestingUserId) {
        assertProjectAccess(req.getProjectId(), requestingUserId);

        // Normalise path: strip leading slash, collapse multiple slashes
        String normPath = normalisePath(req.getPath());
        if (normPath.isEmpty()) {
            throw new IllegalArgumentException("path must not be empty after normalisation.");
        }

        if (fileRepository.existsByProjectIdAndPath(req.getProjectId(), normPath)) {
            throw new IllegalArgumentException(
                    "A file or folder already exists at path: '" + normPath + "'.");
        }

        String name     = extractName(normPath);
        String language = req.isFolder()
                ? "plaintext"
                : resolveLanguage(req.getLanguage(), name);

        IdeFile file = IdeFile.builder()
                .projectId(req.getProjectId())
                .userId(requestingUserId)
                .path(normPath)
                .name(name)
                .content(req.isFolder() ? "" : (req.getContent() != null ? req.getContent() : ""))
                .language(language)
                .isFolder(req.isFolder())
                .build();

        IdeFile saved = fileRepository.save(file);
        log.info("Created IDE {} '{}' (id={}) in project {}",
                saved.isFolder() ? "folder" : "file", normPath, saved.getId(), req.getProjectId());

        return toDetail(saved);
    }

    // ── Update ───────────────────────────────────────────────────────────────────

    @Transactional
    public FileDetail updateFile(UUID fileId, UpdateRequest req, UUID requestingUserId) {
        IdeFile file = loadFile(fileId);
        assertProjectAccess(file.getProjectId(), requestingUserId);

        // Update content
        if (req.getContent() != null && !file.isFolder()) {
            file.setContent(req.getContent());
        }

        // Rename / move
        if (req.getPath() != null) {
            String normPath = normalisePath(req.getPath());
            if (normPath.isEmpty()) {
                throw new IllegalArgumentException("New path must not be empty.");
            }
            // Check for conflict (exclude self)
            fileRepository.findByProjectIdAndPath(file.getProjectId(), normPath)
                    .filter(existing -> !existing.getId().equals(fileId))
                    .ifPresent(dup -> {
                        throw new IllegalArgumentException(
                                "A file or folder already exists at path: '" + normPath + "'.");
                    });
            file.setPath(normPath);
            file.setName(extractName(normPath));
        }

        // Update language
        if (req.getLanguage() != null) {
            file.setLanguage(req.getLanguage());
        } else if (req.getPath() != null && !file.isFolder()) {
            // Re-infer language from new extension after rename
            file.setLanguage(resolveLanguage(null, file.getName()));
        }

        IdeFile saved = fileRepository.save(file);
        log.info("Updated IDE file '{}' (id={})", saved.getPath(), saved.getId());
        return toDetail(saved);
    }

    // ── Delete ───────────────────────────────────────────────────────────────────

    @Transactional
    public void deleteFile(UUID fileId, UUID requestingUserId) {
        IdeFile file = loadFile(fileId);
        assertDeleteAccess(file, requestingUserId);

        if (file.isFolder()) {
            // Remove all children whose path starts with this folder's path + "/"
            String prefix = file.getPath() + "/";
            fileRepository.deleteByProjectIdAndPathStartingWith(file.getProjectId(), prefix);
            log.info("Cascaded delete of children under folder '{}'", file.getPath());
        }

        fileRepository.delete(file);
        log.info("Deleted IDE {} '{}' (id={})",
                file.isFolder() ? "folder" : "file", file.getPath(), file.getId());
    }

    // ── Package-visible helpers (used by ExecutionService) ───────────────────────

    /**
     * Returns all non-folder files for a project without permission check.
     * Callers must have already verified project membership.
     */
    @Transactional(readOnly = true)
    public List<IdeFile> getProjectFilesInternal(UUID projectId) {
        return fileRepository
                .findByProjectIdOrderByIsFolderDescPathAsc(projectId)
                .stream()
                .filter(f -> !f.isFolder())
                .toList();
    }

    /**
     * Returns a single IdeFile by id without permission check.
     * Callers (ExecutionService) are responsible for ensuring access rights.
     */
    @Transactional(readOnly = true)
    public IdeFile getFileEntityInternal(UUID fileId) {
        return fileRepository.findById(fileId)
                .orElseThrow(() -> new NoSuchElementException("IDE file not found: " + fileId));
    }

    // ── Mappers ──────────────────────────────────────────────────────────────────

    private FileListItem toListItem(IdeFile f) {
        return FileListItem.builder()
                .id(f.getId())
                .projectId(f.getProjectId())
                .path(f.getPath())
                .name(f.getName())
                .language(f.getLanguage())
                .isFolder(f.isFolder())
                .createdAt(f.getCreatedAt())
                .updatedAt(f.getUpdatedAt())
                .build();
    }

    private FileDetail toDetail(IdeFile f) {
        return FileDetail.builder()
                .id(f.getId())
                .projectId(f.getProjectId())
                .userId(f.getUserId())
                .path(f.getPath())
                .name(f.getName())
                .content(f.getContent())
                .language(f.getLanguage())
                .isFolder(f.isFolder())
                .createdAt(f.getCreatedAt())
                .updatedAt(f.getUpdatedAt())
                .build();
    }

    // ── Access control ───────────────────────────────────────────────────────────

    /**
     * Asserts that the requesting user is the project owner or a member.
     * Throws {@link SecurityException} if not.
     */
    private void assertProjectAccess(UUID projectId, UUID userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Project not found: " + projectId));

        if (project.getOwnerId().equals(userId)) return;           // owner — full access
        if (memberRepository.existsByProjectIdAndUserId(projectId, userId)) return; // member

        throw new SecurityException("Access denied to project: " + projectId);
    }

    /**
     * Asserts delete permission: file owner or project owner can delete.
     */
    private void assertDeleteAccess(IdeFile file, UUID userId) {
        if (file.getUserId().equals(userId)) return;               // file owner

        Project project = projectRepository.findById(file.getProjectId())
                .orElseThrow(() -> new NoSuchElementException("Project not found: " + file.getProjectId()));
        if (project.getOwnerId().equals(userId)) return;           // project owner

        throw new SecurityException("Access denied: cannot delete file " + file.getId());
    }

    // ── Utilities ────────────────────────────────────────────────────────────────

    private IdeFile loadFile(UUID fileId) {
        return fileRepository.findById(fileId)
                .orElseThrow(() -> new NoSuchElementException("File not found: " + fileId));
    }

    /** Strip leading/trailing slashes and collapse consecutive slashes. */
    static String normalisePath(String raw) {
        return raw.strip()
                  .replaceAll("^/+", "")
                  .replaceAll("/+$", "")
                  .replaceAll("/{2,}", "/");
    }

    /** Extract the filename portion from a path. */
    static String extractName(String path) {
        int slash = path.lastIndexOf('/');
        return slash >= 0 ? path.substring(slash + 1) : path;
    }

    /** Infer Monaco language id from file extension, falling back to "plaintext". */
    private String resolveLanguage(String explicitLanguage, String fileName) {
        if (explicitLanguage != null && !explicitLanguage.isBlank()) return explicitLanguage;
        int dot = fileName.lastIndexOf('.');
        if (dot < 0) return "plaintext";
        return EXT_TO_LANG.getOrDefault(fileName.substring(dot + 1).toLowerCase(), "plaintext");
    }
}
