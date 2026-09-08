package com.devopssuite.notification.event;

import com.devopssuite.auth.repository.UserRepository;
import com.devopssuite.notification.service.EmailNotificationService;
import com.devopssuite.notification.service.NotificationService;
import com.devopssuite.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Consumes Spring application events from the project/task domain and:
 * <ol>
 *   <li>Persists an in-app notification and broadcasts it over WebSocket
 *       via {@link NotificationService}.</li>
 *   <li>Sends an HTML email for the same event via
 *       {@link EmailNotificationService} (no-op when SMTP is not configured).</li>
 * </ol>
 *
 * <p>All handlers use {@code @TransactionalEventListener(AFTER_COMMIT)} so they
 * only fire after the publishing transaction has fully committed. This prevents
 * the race condition where {@code @Async @EventListener} fires on a separate
 * thread before the outer transaction commits, causing DB reads to return stale
 * or missing data (the root cause of role-change notifications not working).</p>
 *
 * <p>Combined with {@code @Async}, the notification work runs off the main
 * thread without blocking the HTTP response.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final EmailNotificationService emailNotificationService;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;

    // ------------------------------------------------------------------
    // Task events
    // ------------------------------------------------------------------

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
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

            userRepository.findById(event.assigneeId()).ifPresent(user -> {
                if (notificationService.isEmailEnabled(event.assigneeId(), "TASK_ASSIGNED")) {
                    String projectName = projectRepository.findById(event.projectId())
                            .map(p -> p.getName())
                            .orElse("your project");
                    emailNotificationService.sendTaskAssignedEmail(
                            user.getEmail(), event.taskTitle(), projectName);
                }
            });
        } catch (Exception e) {
            log.error("Failed to handle TASK_ASSIGNED event", e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTaskReassigned(TaskReassignedEvent event) {
        log.debug("Handling TaskReassignedEvent: task={} newAssignee={}", event.taskId(), event.newAssigneeId());
        try {
            notificationService.createNotification(
                    event.newAssigneeId(),
                    "TASK_REASSIGNED",
                    "Task Reassigned to You",
                    "Task '" + event.taskTitle() + "' has been reassigned to you.",
                    event.projectId(),
                    event.taskId()
            );

            userRepository.findById(event.newAssigneeId()).ifPresent(user -> {
                if (notificationService.isEmailEnabled(event.newAssigneeId(), "TASK_REASSIGNED")) {
                    String projectName = projectRepository.findById(event.projectId())
                            .map(p -> p.getName())
                            .orElse("your project");
                    emailNotificationService.sendTaskReassignedEmail(
                            user.getEmail(), event.taskTitle(), projectName);
                }
            });
        } catch (Exception e) {
            log.error("Failed to handle TASK_REASSIGNED event", e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTaskCompleted(TaskCompletedEvent event) {
        log.debug("Handling TaskCompletedEvent: task={} project={}", event.taskId(), event.projectId());
        try {
            if (event.notifyUserId() == null) return;

            notificationService.createNotification(
                    event.notifyUserId(),
                    "TASK_COMPLETED",
                    "Task Completed",
                    "Task '" + event.taskTitle() + "' has been marked as done.",
                    event.projectId(),
                    event.taskId()
            );

            userRepository.findById(event.notifyUserId()).ifPresent(user -> {
                if (notificationService.isEmailEnabled(event.notifyUserId(), "TASK_COMPLETED")) {
                    emailNotificationService.sendTaskCompletedEmail(user.getEmail(), event.taskTitle());
                }
            });
        } catch (Exception e) {
            log.error("Failed to handle TASK_COMPLETED event", e);
        }
    }

    @Async
    @org.springframework.context.event.EventListener
    public void onExecutionFailed(ExecutionFailedEvent event) {
        log.debug("Handling ExecutionFailedEvent: execution={} user={} status={}",
                event.executionId(), event.userId(), event.status());
        try {
            notificationService.createNotification(
                    event.userId(),
                    "EXECUTION_FAILED",
                    "Code Execution Failed",
                    "Your code execution ended with status: " + event.status(),
                    null,
                    null
            );

            userRepository.findById(event.userId()).ifPresent(user -> {
                if (notificationService.isEmailEnabled(event.userId(), "EXECUTION_FAILED")) {
                    emailNotificationService.sendExecutionFailedEmail(user.getEmail(), event.status());
                }
            });
        } catch (Exception e) {
            log.error("Failed to handle EXECUTION_FAILED event", e);
        }
    }

    // ------------------------------------------------------------------
    // Project membership events
    // ------------------------------------------------------------------

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
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

            userRepository.findById(event.userId()).ifPresent(user -> {
                if (notificationService.isEmailEnabled(event.userId(), "PROJECT_JOINED")) {
                    emailNotificationService.sendProjectJoinedEmail(
                            user.getEmail(), event.projectName(), event.role());
                }
            });
        } catch (Exception e) {
            log.error("Failed to handle PROJECT_JOINED event", e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMemberRoleChanged(MemberRoleChangedEvent event) {
        log.debug("Handling MemberRoleChangedEvent: project={} user={} newRole={} actingUser={}",
                event.projectId(), event.userId(), event.newRole(), event.actingUserId());
        try {
            String projectName = projectRepository.findById(event.projectId())
                    .map(p -> p.getName())
                    .orElse("your project");

            // Resolve the display name of the person who made the change
            String changedBy = userRepository.findById(event.actingUserId())
                    .map(u -> u.getDisplayName() != null && !u.getDisplayName().isBlank()
                            ? u.getDisplayName()
                            : u.getEmail())
                    .orElse("a project admin");

            notificationService.createNotification(
                    event.userId(),
                    "ROLE_CHANGED",
                    "Project Role Updated",
                    "Your role in project '" + projectName + "' has been changed to "
                            + event.newRole() + " by " + changedBy + ".",
                    event.projectId(),
                    null
            );

            userRepository.findById(event.userId()).ifPresent(user -> {
                if (notificationService.isEmailEnabled(event.userId(), "ROLE_CHANGED")) {
                    emailNotificationService.sendRoleChangedEmail(
                            user.getEmail(), projectName, event.newRole());
                }
            });
        } catch (Exception e) {
            log.error("Failed to handle ROLE_CHANGED event", e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMemberRemoved(MemberRemovedEvent event) {
        log.debug("Handling MemberRemovedEvent: project={} user={}", event.projectId(), event.userId());
        try {
            String projectName = projectRepository.findById(event.projectId())
                    .map(p -> p.getName())
                    .orElse("a project");

            notificationService.createNotification(
                    event.userId(),
                    "PROJECT_REMOVED",
                    "Removed from Project",
                    "You have been removed from project '" + projectName + "'",
                    event.projectId(),
                    null
            );

            userRepository.findById(event.userId()).ifPresent(user -> {
                if (notificationService.isEmailEnabled(event.userId(), "PROJECT_REMOVED")) {
                    emailNotificationService.sendProjectRemovedEmail(user.getEmail(), projectName);
                }
            });
        } catch (Exception e) {
            log.error("Failed to handle PROJECT_REMOVED event", e);
        }
    }
}
