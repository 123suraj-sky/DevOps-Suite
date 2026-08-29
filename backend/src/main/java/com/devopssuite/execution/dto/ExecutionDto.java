package com.devopssuite.execution.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class ExecutionDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubmitRequest {
        @NotBlank
        private String language;

        private String version;

        @NotBlank
        @JsonProperty("source_code")
        @JsonAlias("sourceCode")
        private String sourceCode;

        private String stdin;

        @JsonProperty("max_time_ms")
        @JsonAlias("maxTimeMs")
        private Integer maxTimeMs;

        @JsonProperty("max_memory_mb")
        @JsonAlias("maxMemoryMb")
        private Integer maxMemoryMb;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubmitResponse {
        @JsonProperty("execution_id")
        private UUID executionId;

        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class QueryResponse {
        @JsonProperty("execution_id")
        private UUID executionId;

        private String status;

        private String stdout;

        private String stderr;

        @JsonProperty("exit_code")
        private Integer exitCode;

        @JsonProperty("execution_time_ms")
        private Integer executionTimeMs;

        @JsonProperty("memory_used_kb")
        private Integer memoryUsedKb;

        @JsonProperty("timed_out")
        private Boolean timedOut;

        @JsonProperty("oom_killed")
        private Boolean oomKilled;
    }

    /**
     * Single item in the paginated execution history list.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class HistoryItem {
        @JsonProperty("execution_id")
        private UUID executionId;

        private String language;

        private String status;

        @JsonProperty("exit_code")
        private Integer exitCode;

        @JsonProperty("execution_time_ms")
        private Integer executionTimeMs;

        @JsonProperty("timed_out")
        private Boolean timedOut;

        @JsonProperty("oom_killed")
        private Boolean oomKilled;

        @JsonProperty("created_at")
        private Instant createdAt;
    }

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
