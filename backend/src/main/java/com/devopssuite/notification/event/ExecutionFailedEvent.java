package com.devopssuite.notification.event;

import java.util.UUID;

/**
 * Published when a sandboxed code execution ends in a non-success status
 * (FAILED, TIMEOUT, or OOM_KILLED).
 */
public record ExecutionFailedEvent(
        UUID executionId,
        UUID userId,
        String status
) {}
