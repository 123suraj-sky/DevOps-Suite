package com.devopssuite.notification.event;

import com.devopssuite.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Consumes Spring application events from the project/task domain
 * and delegates to {@link NotificationService} to persist and broadcast
 * WebSocket notifications to affected users.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationService notificationService;

    @Async
    @EventListener
    public void onTaskAssigned(TaskAssignedEvent event) {
        log.debug("Handling TaskAssignedEvent: task={} assignee={}", event.taskId(), event.assigneeId());
        try {
            notificationService.createNotification(
                    event.assigneeId(),
                    "TASK_ASSIGNED",
                    "New Task Assigned",
                    "You have been assigned to task: " + event.taskTitle(),
                    event.projectId(),
                    event.taskId()
            );
        } catch (Exception e) {
            log.error("Failed to create TASK_ASSIGNED notification", e);
        }
    }

    @Async
    @EventListener
    public void onMemberAdded(MemberAddedEvent event) {
        log.debug("Handling MemberAddedEvent: project={} user={}", event.projectId(), event.userId());
        try {
            notificationService.createNotification(
                    event.userId(),
                    "PROJECT_JOINED",
                    "Added to Project",
                    "You have been added to project '" + event.projectName() + "' as " + event.role(),
                    event.projectId(),
                    null
            );
        } catch (Exception e) {
            log.error("Failed to create PROJECT_JOINED notification", e);
        }
    }

    @Async
    @EventListener
    public void onMemberRoleChanged(MemberRoleChangedEvent event) {
        log.debug("Handling MemberRoleChangedEvent: project={} user={} newRole={}",
                event.projectId(), event.userId(), event.newRole());
        try {
            notificationService.createNotification(
                    event.userId(),
                    "ROLE_CHANGED",
                    "Project Role Updated",
                    "Your role in the project has been updated to " + event.newRole(),
                    event.projectId(),
                    null
            );
        } catch (Exception e) {
            log.error("Failed to create ROLE_CHANGED notification", e);
        }
    }

    @Async
    @EventListener
    public void onMemberRemoved(MemberRemovedEvent event) {
        log.debug("Handling MemberRemovedEvent: project={} user={}", event.projectId(), event.userId());
        try {
            notificationService.createNotification(
                    event.userId(),
                    "PROJECT_REMOVED",
                    "Removed from Project",
                    "You have been removed from a project",
                    event.projectId(),
                    null
            );
        } catch (Exception e) {
            log.error("Failed to create PROJECT_REMOVED notification", e);
        }
    }
}
