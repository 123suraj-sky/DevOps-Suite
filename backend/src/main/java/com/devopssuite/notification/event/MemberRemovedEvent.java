package com.devopssuite.notification.event;

import java.util.UUID;

/** Published when a member is removed from a project. */
public record MemberRemovedEvent(
        UUID projectId,
        UUID userId
) {}
