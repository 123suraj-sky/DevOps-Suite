package com.devopssuite.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/**
 * Stores and deletes avatar image files on the local filesystem
 * (backed by a Docker named volume at /app/uploads/avatars/).
 *
 * The returned URL path (/uploads/avatars/{filename}) is a relative
 * path that the static-resource handler serves back to the browser.
 */
@Service
public class AvatarStorageService {

    /** Absolute directory path where avatar files are stored. */
    private final Path storageDir;

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/png", "image/jpeg", "image/webp"
    );
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    public AvatarStorageService(
            @Value("${app.avatar.upload-dir:/app/uploads/avatars}") String uploadDir) {
        this.storageDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageDir);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create avatar upload directory: " + uploadDir, e);
        }
    }

    /**
     * Persist the uploaded file and return the public URL path
     * (e.g. {@code /uploads/avatars/abc123.png}).
     */
    public String store(MultipartFile file) throws IOException {
        validateFile(file);

        String extension = resolveExtension(file.getContentType());
        String filename = UUID.randomUUID() + extension;
        Path target = this.storageDir.resolve(filename);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/avatars/" + filename;
    }

    /**
     * Delete a previously stored avatar.  Safe to call with {@code null}
     * or a URL that doesn't start with {@code /uploads/avatars/}.
     */
    public void delete(String avatarUrl) {
        if (avatarUrl == null || !avatarUrl.startsWith("/uploads/avatars/")) {
            return;
        }
        String filename = avatarUrl.substring("/uploads/avatars/".length());
        // Guard against path traversal
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return;
        }
        try {
            Path file = this.storageDir.resolve(filename);
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // Best-effort; do not fail the request if the old file is missing
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file provided");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size must not exceed 5 MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only PNG, JPEG, and WEBP images are accepted");
        }
    }

    private String resolveExtension(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            default -> ".png";
        };
    }
}
