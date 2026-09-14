package com.devopssuite.logging.service;

import com.devopssuite.logging.event.LogEvent;
import com.devopssuite.notification.event.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

/**
 * Listens for platform domain events and publishes structured AUDIT log events
 * so they are indexed into Elasticsearch (and visible in Kibana / stream logs).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLogEventListener {

    private final ApplicationEventPublisher eventPublisher;

    @Async
    @EventListener
    public void onTaskAssigned(TaskAssignedEvent event) {
        publishAuditLog(
                "TASK_ASSIGNED",
                "/tasks/" + event.taskId() + "/assign",
                event.projectId(),
                event.assigneeId() != null ? event.assigneeId().toString() : null,
                "INFO",
                "Assigned task: " + event.taskTitle(),
                Map.of("taskId", event.taskId().toString(), "title", event.taskTitle())
        );
    }

    @Async
    @EventListener
    public void onTaskCompleted(TaskCompletedEvent event) {
        publishAuditLog(
                "TASK_COMPLETED",
                "/tasks/" + event.taskId() + "/status/done",
                event.projectId(),
                event.notifyUserId() != null ? event.notifyUserId().toString() : null,
                "INFO",
                "Task completed: " + event.taskTitle(),
                Map.of("taskId", event.taskId().toString(), "title", event.taskTitle())
        );
    }

    @Async
    @EventListener
    public void onTaskReassigned(TaskReassignedEvent event) {
        publishAuditLog(
                "TASK_REASSIGNED",
                "/tasks/" + event.taskId() + "/reassign",
                event.projectId(),
                event.newAssigneeId() != null ? event.newAssigneeId().toString() : null,
                "INFO",
                "Reassigned task: " + event.taskTitle(),
                Map.of("taskId", event.taskId().toString(), "title", event.taskTitle())
        );
    }

    @Async
    @EventListener
    public void onMemberAdded(MemberAddedEvent event) {
        publishAuditLog(
                "MEMBER_ADDED",
                "/projects/" + event.projectId() + "/members",
                event.projectId(),
                event.userId() != null ? event.userId().toString() : null,
                "INFO",
                "Member added with role " + event.role() + " to project " + event.projectName(),
                Map.of("role", event.role(), "projectName", event.projectName())
        );
    }

    @Async
    @EventListener
    public void onMemberRemoved(MemberRemovedEvent event) {
        publishAuditLog(
                "MEMBER_REMOVED",
                "/projects/" + event.projectId() + "/members/" + event.userId(),
                event.projectId(),
                event.userId() != null ? event.userId().toString() : null,
                "WARN",
                "Member removed from project",
                Map.of("userId", event.userId().toString())
        );
    }

    @Async
    @EventListener
    public void onMemberRoleChanged(MemberRoleChangedEvent event) {
        publishAuditLog(
                "ROLE_CHANGED",
                "/projects/" + event.projectId() + "/members/" + event.userId() + "/role",
                event.projectId(),
                event.actingUserId() != null ? event.actingUserId().toString() : null,
                "INFO",
                "Member role changed to " + event.newRole(),
                Map.of("targetUserId", event.userId().toString(), "newRole", event.newRole())
        );
    }

    @Async
    @EventListener
    public void onExecutionFailed(ExecutionFailedEvent event) {
        publishAuditLog(
                "EXECUTION_FAILED",
                "/code-execution/" + event.executionId(),
                null,
                event.userId() != null ? event.userId().toString() : null,
                "ERROR",
                "Code execution terminated with " + event.status(),
                Map.of("executionId", event.executionId().toString(), "status", event.status())
        );
    }

    private void publishAuditLog(
            String method,
            String uri,
            java.util.UUID projectId,
            String userId,
            String level,
            String message,
            Map<String, Object> metadata
    ) {
        try {
            LogEvent logEvent = LogEvent.builder()
                    .method("AUDIT:" + method)
                    .uri(uri)
                    .status("ERROR".equals(level) ? 500 : "WARN".equals(level) ? 400 : 200)
                    .durationMs(0)
                    .userId(userId)
                    .projectId(projectId)
                    .timestamp(Instant.now())
                    .level(level)
                    .traceId("audit-" + java.util.UUID.randomUUID().toString().substring(0, 8))
                    .clientIp(null)
                    .userAgent("DevOps-Suite-Audit-System")
                    .errorMessage("ERROR".equals(level) || "WARN".equals(level) ? message : null)
                    .eventType("AUDIT")
                    .metadata(metadata)
                    .build();

            eventPublisher.publishEvent(logEvent);
        } catch (Exception e) {
            log.warn("Failed to publish audit log event for {}: {}", method, e.getMessage());
        }
    }
}
