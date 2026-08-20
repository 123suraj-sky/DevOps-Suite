package com.devopssuite.logging.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Fired by {@code RequestLoggingFilter} for every HTTP request/response pair.
 * Consumers:
 *   - ElasticsearchLogService  -> indexes to ES
 *   - LogStreamingService      -> broadcasts over WebSocket /topic/logs/{projectId}
 */
public record LogEvent(
        String method,
        String uri,
        int status,
        long durationMs,
        String userId,
        UUID projectId,
        Instant timestamp
) {}
