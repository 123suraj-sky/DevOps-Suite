package com.devopssuite.logging.event;

import lombok.Builder;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Event published for logging and streaming.
 * Consumers:
 *   - ElasticsearchLogService  -> indexes to ES
 *   - LogStreamingService      -> broadcasts over WebSocket /topic/logs/{projectId}
 */
@Builder(toBuilder = true)
public record LogEvent(
        String method,
        String uri,
        int status,
        long durationMs,
        String userId,
        UUID projectId,
        Instant timestamp,
        String level,
        String traceId,
        String clientIp,
        String userAgent,
        String errorMessage,
        String errorClass,
        String eventType,
        Map<String, Object> metadata
) {
    /**
     * Backward-compatible constructor for existing callers.
     */
    public LogEvent(
            String method,
            String uri,
            int status,
            long durationMs,
            String userId,
            UUID projectId,
            Instant timestamp
    ) {
        this(
                method,
                uri,
                status,
                durationMs,
                userId,
                projectId,
                timestamp,
                status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO",
                null,
                null,
                null,
                null,
                null,
                "HTTP",
                null
        );
    }
}
