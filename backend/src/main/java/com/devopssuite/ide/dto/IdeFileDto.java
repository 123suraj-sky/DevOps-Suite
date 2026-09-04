package com.devopssuite.ide.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * All DTOs for the IDE file CRUD API.
 */
public class IdeFileDto {

    // ── List item (no content — avoids sending large blobs for tree renders) ──

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class FileListItem {
        private UUID id;

        @JsonProperty("project_id")
        private UUID projectId;

        private String path;
        private String name;
        private String language;

        @JsonProperty("is_folder")
        private boolean isFolder;

        @JsonProperty("created_at")
        private Instant createdAt;

        @JsonProperty("updated_at")
        private Instant updatedAt;
    }

    // ── Full file (includes content — fetched when opening a tab) ──────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class FileDetail {
        private UUID id;

        @JsonProperty("project_id")
        private UUID projectId;

        @JsonProperty("user_id")
        private UUID userId;

        private String path;
        private String name;
        private String content;
        private String language;

        @JsonProperty("is_folder")
        private boolean isFolder;

        @JsonProperty("created_at")
        private Instant createdAt;

        @JsonProperty("updated_at")
        private Instant updatedAt;
    }

    // ── Create request ───────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {

        @NotNull(message = "project_id is required")
        @JsonProperty("project_id")
        private UUID projectId;

        /**
         * Full relative path from workspace root, e.g. "src/main.py".
         * Must not be blank, max 1000 chars, no leading slash.
         */
        @NotBlank(message = "path must not be blank")
        @Size(max = 1000, message = "path must not exceed 1000 characters")
        private String path;

        /** File content. Ignored for folder entries. */
        private String content;

        /**
         * Monaco language id: "python", "javascript", "java", "cpp", "plaintext", etc.
         * If omitted the service infers it from the file extension.
         */
        private String language;

        /** True to create a virtual folder entry. */
        @Setter(onMethod_ = @JsonProperty("is_folder"))
        @Getter(onMethod_ = @JsonProperty("is_folder"))
        @Builder.Default
        private boolean isFolder = false;
    }

    // ── Update request ───────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateRequest {

        /** New content. Null means "don't change content". */
        private String content;

        /**
         * New path (rename / move). Null means "don't rename".
         * When provided, {@code name} is re-derived from this path.
         */
        @Size(max = 1000, message = "path must not exceed 1000 characters")
        private String path;

        /** Override language. Null means "keep existing". */
        private String language;
    }

    // ── Generic API envelope ─────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ApiResponse<T> {
        @Builder.Default
        private String status = "success";
        private String message;
        private T data;
    }
}
