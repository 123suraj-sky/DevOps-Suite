package com.devopssuite.notification.event;

import java.util.UUID;

/** Published when a task is assigned to a user. */
public record TaskAssignedEvent(
        UUID taskId,
        UUID assigneeId,
        UUID projectId,
        String taskTitle
) {}
