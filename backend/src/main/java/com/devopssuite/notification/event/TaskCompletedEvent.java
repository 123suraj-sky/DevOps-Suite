package com.devopssuite.notification.event;

import java.util.UUID;

/**
 * Published when a task is moved to the Done column.
 *
 * @param notifyUserId the user to notify (typically the project owner or task creator)
 */
public record TaskCompletedEvent(
        UUID taskId,
        UUID projectId,
        String taskTitle,
        UUID notifyUserId
) {}
