package com.devopssuite.ide.controller;

import com.devopssuite.ide.dto.IdeFileDto.*;
import com.devopssuite.ide.service.IdeFileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for the IDE file system.
 *
 * <p>Base path: {@code /api/ide/files}
 *
 * <pre>
 * GET    /api/ide/files?projectId=   — list all files/folders for a project (no content)
 * GET    /api/ide/files/{id}         — get a single file with full content
 * POST   /api/ide/files              — create a new file or folder
 * PUT    /api/ide/files/{id}         — update content / rename
 * DELETE /api/ide/files/{id}         — delete a file (or folder + all children)
 * </pre>
 */
@RestController
@RequestMapping("/api/ide/files")
@RequiredArgsConstructor
public class IdeFileController {

    private final IdeFileService ideFileService;

    // ── List ─────────────────────────────────────────────────────────────────────

    /**
     * GET /api/ide/files?projectId={uuid}
     * Returns the full file tree (metadata only, no content) for a project.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<FileListItem>>> listFiles(
            @RequestParam("projectId") UUID projectId) {

        List<FileListItem> files = ideFileService.listFiles(projectId, currentUserId());
        return ResponseEntity.ok(ApiResponse.<List<FileListItem>>builder()
                .message("Files retrieved")
                .data(files)
                .build());
    }

    // ── Get ──────────────────────────────────────────────────────────────────────

    /**
     * GET /api/ide/files/{id}
     * Returns a single file including its full content.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FileDetail>> getFile(@PathVariable UUID id) {
        FileDetail file = ideFileService.getFile(id, currentUserId());
        return ResponseEntity.ok(ApiResponse.<FileDetail>builder()
                .message("File retrieved")
                .data(file)
                .build());
    }

    // ── Create ───────────────────────────────────────────────────────────────────

    /**
     * POST /api/ide/files
     * Creates a new file or folder entry.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<FileDetail>> createFile(
            @Valid @RequestBody CreateRequest request) {

        FileDetail created = ideFileService.createFile(request, currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<FileDetail>builder()
                        .message("File created")
                        .data(created)
                        .build());
    }

    // ── Update ───────────────────────────────────────────────────────────────────

    /**
     * PUT /api/ide/files/{id}
     * Updates file content and/or renames/moves it.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FileDetail>> updateFile(
            @PathVariable UUID id,
            @RequestBody UpdateRequest request) {

        FileDetail updated = ideFileService.updateFile(id, request, currentUserId());
        return ResponseEntity.ok(ApiResponse.<FileDetail>builder()
                .message("File updated")
                .data(updated)
                .build());
    }

    // ── Delete ───────────────────────────────────────────────────────────────────

    /**
     * DELETE /api/ide/files/{id}
     * Deletes a file. If the entry is a folder, all children are also deleted.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFile(@PathVariable UUID id) {
        ideFileService.deleteFile(id, currentUserId());
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("File deleted")
                .build());
    }

    // ── Helper ───────────────────────────────────────────────────────────────────

    private UUID currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return UUID.fromString((String) auth.getPrincipal());
    }
}
