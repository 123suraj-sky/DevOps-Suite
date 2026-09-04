package com.devopssuite.execution.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class ExecutionDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubmitRequest {
        /**
         * Required when submitting raw source code (classic mode).
         * Optional when {@code file_id} is provided — the language is then
         * inferred from the IDE file's stored language field.
         */
        private String language;

        private String version;

        /**
         * Inline source code (classic mode). Mutually exclusive with {@code file_id}.
         * Exactly one of {@code source_code} or {@code file_id} must be present.
         */
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

        /**
         * IDE file UUID (IDE mode). When set, the backend loads the file (plus all
         * sibling project files) and runs them as a multi-file workspace. The
         * language is taken from the stored file's {@code language} field unless
         * overridden by the {@code language} field above.
         */
        @JsonProperty("file_id")
        @JsonAlias("fileId")
        private UUID fileId;
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
