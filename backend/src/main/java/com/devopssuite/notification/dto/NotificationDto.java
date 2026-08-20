package com.devopssuite.notification.dto;

import java.time.Instant;
import java.util.UUID;

public class NotificationDto {

    /** Full notification response returned from the REST API. */
    public record NotificationResponse(
            UUID id,
            UUID userId,
            String type,
            String title,
            String message,
            UUID projectId,
            UUID taskId,
            boolean read,
            Instant createdAt
    ) {}

    /** Lightweight response for unread count badge. */
    public record UnreadCountResponse(long count) {}
}
