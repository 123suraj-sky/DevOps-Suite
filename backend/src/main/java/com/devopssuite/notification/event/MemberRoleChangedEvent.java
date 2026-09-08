package com.devopssuite.notification.event;

import java.util.UUID;

/** Published when an existing project member's role is changed. */
public record MemberRoleChangedEvent(
        UUID projectId,
        UUID userId,
        String newRole,
        UUID actingUserId   // the user who performed the role change
) {}
