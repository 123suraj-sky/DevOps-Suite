package com.devopssuite.ide.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Represents a single file (or folder entry) inside a project's IDE workspace.
 *
 * <p>Files are stored per-project and per-user. The {@code path} field is the
 * full relative path from the workspace root (e.g. {@code "src/utils.py"}).
 * Folder entries have {@code isFolder = true} and empty content.
 */
@Entity
@Table(
    name = "ide_files",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_ide_file_path",
        columnNames = {"project_id", "path"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IdeFile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** The project this file belongs to. */
    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    /** The user who owns / created this file. */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /**
     * Full relative path from the workspace root.
     * Examples: {@code "main.py"}, {@code "src/helpers/utils.js"}.
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String path;

    /** Filename portion only — derived from path on creation/rename. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String name;

    /** File content. Empty string for folders. */
    @Column(nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private String content = "";

    /**
     * Monaco/language-id string: "python", "javascript", "java", "cpp",
     * "plaintext", etc.
     */
    @Column(nullable = false)
    @Builder.Default
    private String language = "plaintext";

    /** True for virtual folder entries (content is always empty). */
    @Column(name = "is_folder", nullable = false)
    @Builder.Default
    private boolean isFolder = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        if (updatedAt == null) updatedAt = createdAt;
    }
}
