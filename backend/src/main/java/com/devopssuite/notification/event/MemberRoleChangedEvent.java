package com.devopssuite.notification.event;

import java.util.UUID;

/** Published when an existing project member's role is changed. */
public record MemberRoleChangedEvent(
        UUID projectId,
        UUID userId,
        String newRole
) {}
