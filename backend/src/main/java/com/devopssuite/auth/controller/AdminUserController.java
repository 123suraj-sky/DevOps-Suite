package com.devopssuite.auth.controller;

import com.devopssuite.auth.model.Role;
import com.devopssuite.auth.model.User;
import com.devopssuite.auth.repository.UserRepository;
import com.devopssuite.logging.service.LogSearchService;
import com.devopssuite.project.model.Task;
import com.devopssuite.project.repository.TaskRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Controller for platform administrators to monitor users, cross-project task assignments/creations,
 * and user activity logs across the entire platform.
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_OWNER')")
public class AdminUserController {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final LogSearchService logSearchService;
    private final StringRedisTemplate redisTemplate;

    private static final String ACTIVE_USERS_KEY = "metrics:active_users";

    @Data
    @Builder
    public static class AdminUserSummary {
        private UUID id;
        private String email;
        private String displayName;
        private String avatarUrl;
        private String gender;
        private String oauthProvider;
        private List<String> roles;
        private Instant createdAt;
        private Instant lastLoginAt;
        private boolean activeRecently;
    }

    @Data
    @Builder
    public static class AdminUserTaskDetail {
        private UUID taskId;
        private String title;
        private String description;
        private String status;
        private String priority;
        private String dueDate;
        private Instant createdAt;
        private UUID projectId;
        private String projectName;
        private String boardName;
        private String columnName;
        private boolean isCreator;
        private boolean isAssignee;
    }

    /**
     * List all registered users with their roles, last login, and real-time active status.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllUsers() {
        List<User> users = userRepository.findAll();

        // Check active users in Redis sorted set
        Set<String> activeUserKeys = Collections.emptySet();
        try {
            double fiveMinutesAgo = System.currentTimeMillis() - (5 * 60 * 1000.0);
            activeUserKeys = redisTemplate.opsForZSet().rangeByScore(ACTIVE_USERS_KEY, fiveMinutesAgo, Double.POSITIVE_INFINITY);
            if (activeUserKeys == null) {
                activeUserKeys = Collections.emptySet();
            }
        } catch (Exception e) {
            log.warn("Failed to read active_users from Redis: {}", e.getMessage());
        }

        final Set<String> activeSet = activeUserKeys;

        List<AdminUserSummary> summaries = users.stream().map(u -> {
            boolean isActive = activeSet.contains(u.getEmail()) || activeSet.contains(u.getId().toString());
            return AdminUserSummary.builder()
                    .id(u.getId())
                    .email(u.getEmail())
                    .displayName(u.getDisplayName())
                    .avatarUrl(u.getAvatarUrl())
                    .gender(u.getGender() != null ? u.getGender().name() : null)
                    .oauthProvider(u.getOauthProvider())
                    .roles(u.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                    .createdAt(u.getCreatedAt())
                    .lastLoginAt(u.getLastLoginAt())
                    .activeRecently(isActive)
                    .build();
        }).sorted((a, b) -> {
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        }).toList();

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "totalUsers", summaries.size(),
                "activeUsersCount", summaries.stream().filter(AdminUserSummary::isActiveRecently).count(),
                "data", summaries
        ));
    }

    /**
     * Get all tasks created by or assigned to a specific user across all projects.
     */
    @GetMapping("/{userId}/tasks")
    public ResponseEntity<Map<String, Object>> getUserTasks(@PathVariable UUID userId) {
        List<Object[]> results = taskRepository.findTasksByUserWithProjectAndBoard(userId);

        List<AdminUserTaskDetail> taskDetails = results.stream().map(row -> {
            Task task = (Task) row[0];
            UUID projectId = (UUID) row[1];
            String projectName = (String) row[2];
            String boardName = (String) row[3];
            String columnName = (String) row[4];

            boolean isCreator = userId.equals(task.getCreatedBy());
            boolean isAssignee = userId.equals(task.getAssigneeId());

            return AdminUserTaskDetail.builder()
                    .taskId(task.getId())
                    .title(task.getTitle())
                    .description(task.getDescription())
                    .status(task.getStatus())
                    .priority(task.getPriority())
                    .dueDate(task.getDueDate() != null ? task.getDueDate().toString() : null)
                    .createdAt(task.getCreatedAt())
                    .projectId(projectId)
                    .projectName(projectName)
                    .boardName(boardName)
                    .columnName(columnName)
                    .isCreator(isCreator)
                    .isAssignee(isAssignee)
                    .build();
        }).toList();

        long createdCount = taskDetails.stream().filter(AdminUserTaskDetail::isCreator).count();
        long assignedCount = taskDetails.stream().filter(AdminUserTaskDetail::isAssignee).count();

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "userId", userId,
                "totalTasks", taskDetails.size(),
                "createdCount", createdCount,
                "assignedCount", assignedCount,
                "data", taskDetails
        ));
    }

    /**
     * Get request and audit logs for a specific user from Elasticsearch.
     */
    @GetMapping("/{userId}/logs")
    public ResponseEntity<Map<String, Object>> getUserLogs(
            @PathVariable UUID userId,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "100") int size) {

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // Search in Elasticsearch using user email as userId identifier
        List<Map<String, Object>> logs = logSearchService.searchUserLogs(user.getEmail(), query, size);

        // If no logs found with email, fallback to user ID string
        if (logs.isEmpty()) {
            logs = logSearchService.searchUserLogs(userId.toString(), query, size);
        }

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "userId", userId,
                "userEmail", user.getEmail(),
                "count", logs.size(),
                "data", logs
        ));
    }
}
