package com.devopssuite.notification.event;

import java.util.UUID;

/** Published when a user is added to a project. */
public record MemberAddedEvent(
        UUID projectId,
        UUID userId,
        String projectName,
        String role
) {}
