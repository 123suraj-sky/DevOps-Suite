package com.devopssuite.metrics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryResponse {

    private TaskStats taskStats;
    private long executionsThisWeek;
    private List<RecentExecution> recentExecutions;
    private List<ActivityEvent> recentActivity;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskStats {
        private long open;
        private long inProgress;
        private long completed;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentExecution {
        private UUID executionId;
        private String language;
        private String status;
        private long executionTimeMs;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityEvent {
        private String type;
        private String description;
        private Instant timestamp;
    }
}
