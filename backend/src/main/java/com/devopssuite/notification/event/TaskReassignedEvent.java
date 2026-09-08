package com.devopssuite.notification.event;

import java.util.UUID;

/** Published when an existing task's assignee is changed. */
public record TaskReassignedEvent(
        UUID taskId,
        UUID newAssigneeId,
        UUID projectId,
        String taskTitle
) {}
