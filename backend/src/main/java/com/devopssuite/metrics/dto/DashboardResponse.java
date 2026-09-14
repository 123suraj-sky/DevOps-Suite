package com.devopssuite.metrics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private long projectCount;
    private TaskSummary taskSummary;
    private List<ServiceHealth> serviceHealth;
    private List<ThroughputMetric> throughput;
    private List<LatencyMetric> latency;
    private List<RecentExecution> recentExecutions;
    private List<RecentActivity> recentActivity;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentExecution {
        private java.util.UUID executionId;
        private String language;
        private String status;
        private long executionTimeMs;
        private java.time.Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentActivity {
        private String type;
        private String description;
        private java.time.Instant timestamp;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskSummary {
        private long todo;
        private long inProgress;
        private long done;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceHealth {
        private String serviceName;
        private String status;
        private long responseTimeMs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ThroughputMetric {
        private String time;
        private int RPM;
        private int errors;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LatencyMetric {
        private String time;
        private int p50;
        private int p99;
    }
}
