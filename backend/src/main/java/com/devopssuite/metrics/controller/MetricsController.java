package com.devopssuite.metrics.controller;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import com.devopssuite.metrics.dto.DashboardResponse;
import com.devopssuite.project.dto.ProjectDto.ApiResponse;
import com.devopssuite.project.model.Project;
import com.devopssuite.project.repository.ProjectRepository;
import com.devopssuite.project.repository.TaskRepository;
import com.github.dockerjava.api.DockerClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/metrics", "/api/metrics"})
@RequiredArgsConstructor
@Slf4j
public class MetricsController {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final StringRedisTemplate redisTemplate;

    @Autowired(required = false)
    private ElasticsearchClient elasticsearchClient;

    @Autowired(required = false)
    private DockerClient dockerClient;

    private UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication is required");
        }
        String userIdStr = (String) authentication.getPrincipal();
        return UUID.fromString(userIdStr);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(@RequestParam(name = "projectId", defaultValue = "default") String projectIdStr) {
        UUID userId = getCurrentUserId();

        long projectCount;
        DashboardResponse.TaskSummary taskSummary;

        if ("default".equals(projectIdStr)) {
            List<Project> visibleProjects = projectRepository.findVisibleToUser(userId);
            projectCount = visibleProjects.size();

            if (visibleProjects.isEmpty()) {
                taskSummary = DashboardResponse.TaskSummary.builder()
                        .todo(0)
                        .inProgress(0)
                        .done(0)
                        .build();
            } else {
                List<UUID> projectIds = visibleProjects.stream().map(Project::getId).collect(Collectors.toList());
                taskSummary = DashboardResponse.TaskSummary.builder()
                        .todo(taskRepository.countByProjectIdsAndStatusIn(projectIds, Arrays.asList("TODO", "BACKLOG")))
                        .inProgress(taskRepository.countByProjectIdsAndStatusIn(projectIds, Arrays.asList("IN_PROGRESS", "IN_REVIEW")))
                        .done(taskRepository.countByProjectIdsAndStatusIn(projectIds, Collections.singletonList("DONE")))
                        .build();
            }
        } else {
            UUID projectId = UUID.fromString(projectIdStr);
            projectCount = 1;
            taskSummary = DashboardResponse.TaskSummary.builder()
                    .todo(taskRepository.countByProjectIdAndStatusIn(projectId, Arrays.asList("TODO", "BACKLOG")))
                    .inProgress(taskRepository.countByProjectIdAndStatusIn(projectId, Arrays.asList("IN_PROGRESS", "IN_REVIEW")))
                    .done(taskRepository.countByProjectIdAndStatusIn(projectId, Collections.singletonList("DONE")))
                    .build();
        }

        // Service Health checks
        List<DashboardResponse.ServiceHealth> serviceHealth = new ArrayList<>();
        serviceHealth.add(checkPostgresHealth());
        serviceHealth.add(checkRedisHealth());
        serviceHealth.add(checkElasticsearchHealth());
        serviceHealth.add(checkDockerHealth());

        // Generate throughput & latency for UI charts
        List<DashboardResponse.ThroughputMetric> throughput = new ArrayList<>();
        List<DashboardResponse.LatencyMetric> latency = new ArrayList<>();
        Random random = new Random();
        for (int i = 9; i >= 0; i--) {
            throughput.add(DashboardResponse.ThroughputMetric.builder()
                    .time(i == 0 ? "Now" : i + "m ago")
                    .RPM(random.nextInt(60) + 15)
                    .errors(random.nextInt(3))
                    .build());

            latency.add(DashboardResponse.LatencyMetric.builder()
                    .time(i == 0 ? "Now" : i + "m ago")
                    .p50(random.nextInt(50) + 30)
                    .p99(random.nextInt(150) + 90)
                    .build());
        }

        DashboardResponse response = DashboardResponse.builder()
                .projectCount(projectCount)
                .taskSummary(taskSummary)
                .serviceHealth(serviceHealth)
                .throughput(throughput)
                .latency(latency)
                .build();

        return ResponseEntity.ok(ApiResponse.<DashboardResponse>builder()
                .status("success")
                .message("Dashboard metrics loaded successfully")
                .data(response)
                .build());
    }

    private DashboardResponse.ServiceHealth checkPostgresHealth() {
        long start = System.currentTimeMillis();
        String status = "UP";
        try {
            projectRepository.count();
        } catch (Exception e) {
            log.error("PostgreSQL health check failed", e);
            status = "DOWN";
        }
        return DashboardResponse.ServiceHealth.builder()
                .serviceName("PostgreSQL")
                .status(status)
                .responseTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    private DashboardResponse.ServiceHealth checkRedisHealth() {
        long start = System.currentTimeMillis();
        String status = "UP";
        try {
            redisTemplate.getConnectionFactory().getConnection().ping();
        } catch (Exception e) {
            log.error("Redis health check failed", e);
            status = "DOWN";
        }
        return DashboardResponse.ServiceHealth.builder()
                .serviceName("Redis")
                .status(status)
                .responseTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    private DashboardResponse.ServiceHealth checkElasticsearchHealth() {
        long start = System.currentTimeMillis();
        String status = "UP";
        try {
            if (elasticsearchClient != null) {
                elasticsearchClient.ping();
            } else {
                status = "DOWN";
            }
        } catch (Exception e) {
            log.error("Elasticsearch health check failed", e);
            status = "DOWN";
        }
        return DashboardResponse.ServiceHealth.builder()
                .serviceName("Elasticsearch")
                .status(status)
                .responseTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    private DashboardResponse.ServiceHealth checkDockerHealth() {
        long start = System.currentTimeMillis();
        String status = "UP";
        try {
            if (dockerClient != null) {
                dockerClient.pingCmd().exec();
            } else {
                status = "DOWN";
            }
        } catch (Exception e) {
            log.error("Docker health check failed", e);
            status = "DOWN";
        }
        return DashboardResponse.ServiceHealth.builder()
                .serviceName("Docker Engine")
                .status(status)
                .responseTimeMs(System.currentTimeMillis() - start)
                .build();
    }
}
