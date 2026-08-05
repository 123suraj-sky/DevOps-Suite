package com.devopssuite.monolith.project.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class ProjectDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectRequest {
        @NotBlank
        private String name;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ProjectResponse {
        // Frontend compatibility. The public API field is project_id.
        private UUID id;
        
        @JsonProperty("project_id")
        private UUID projectId;
        
        private String name;
        private String description;
        
        @JsonProperty("owner_id")
        private UUID ownerId;
        
        private String status;
        
        @JsonProperty("created_at")
        private Instant createdAtSnake;
        
        private Instant createdAt;
        
        @JsonProperty("updated_at")
        private Instant updatedAtSnake;
        
        private Instant updatedAt;
        
        private List<MemberResponse> members;
        
        @JsonProperty("member_count")
        private int memberCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectListResponse {
        private List<ProjectResponse> projects;
        private List<ProjectResponse> content; // For frontend data.content compatibility
        private long total;
        private int page;
        private int size;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberRequest {
        @NotNull
        @JsonAlias("user_id")
        private UUID userId;

        @NotBlank
        private String role;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberResponse {
        @JsonProperty("userId")
        private UUID userId;
        
        @JsonProperty("user_id")
        private UUID userIdSnake;

        private String email;
        private String displayName;
        private String role;
        
        @JsonProperty("joined_at")
        private Instant joinedAtSnake;
        
        private Instant joinedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BoardRequest {
        @NotBlank
        private String name;
        private String description;

        @Min(0)
        private int sortOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BoardResponse {
        private UUID id;
        
        @JsonProperty("board_id")
        private UUID boardId;
        
        @JsonProperty("project_id")
        private UUID projectId;
        
        private String name;
        private String description;
        
        @JsonProperty("sort_order")
        private int sortOrder;
        
        private List<ColumnResponse> columns;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ColumnRequest {
        @NotBlank
        private String name;
        
        @JsonAlias("color_hex")
        private String colorHex;
        
        @Min(0)
        @JsonAlias("sort_order")
        private int sortOrder;
        
        @Min(0)
        @JsonAlias("wip_limit")
        private int wipLimit;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ColumnResponse {
        private UUID id;
        
        @JsonProperty("column_id")
        private UUID columnId;
        
        @JsonProperty("board_id")
        private UUID boardId;
        
        private String name;
        
        @JsonProperty("color_hex")
        private String colorHex;
        
        @JsonProperty("sort_order")
        private int sortOrder;
        
        @JsonProperty("wip_limit")
        private int wipLimit;
        
        private List<TaskResponse> tasks;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskRequest {
        @JsonAlias("column_id")
        private UUID columnId;
        
        @JsonAlias("assignee_id")
        private UUID assigneeId;
        
        @NotBlank
        private String title;
        private String description;

        @Min(0)
        private int priority;
        private String status;
        
        @JsonAlias("due_date")
        private LocalDate dueDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class TaskResponse {
        private UUID id;
        
        @JsonProperty("column_id")
        private UUID columnId;
        
        @JsonProperty("assignee_id")
        private UUID assigneeId;
        
        private String title;
        private String description;
        private int priority;
        private String status;
        
        @JsonProperty("due_date")
        private LocalDate dueDate;
        
        @JsonProperty("sort_order")
        private int sortOrder;
        
        @JsonProperty("created_at")
        private Instant createdAt;
        
        @JsonProperty("updated_at")
        private Instant updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskStatusRequest {
        @NotBlank
        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReorderTasksRequest {
        @Valid
        private List<ReorderTaskItem> tasks;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReorderTaskItem {
        @NotNull
        private UUID id;
        
        @NotNull
        @JsonAlias("column_id")
        private UUID columnId;
        
        @Min(0)
        @JsonAlias("sort_order")
        private int sortOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ErrorResponse {
        private ErrorBody error;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ErrorBody {
        private String code;
        private String message;
        private List<FieldError> details;

        @JsonProperty("request_id")
        private String requestId;

        private Instant timestamp;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FieldError {
        private String field;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiResponse<T> {
        @Builder.Default
        private String status = "success";
        private String message;
        private T data;
    }
}
