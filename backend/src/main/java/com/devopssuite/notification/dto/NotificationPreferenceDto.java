package com.devopssuite.notification.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public class NotificationPreferenceDto {

    /**
     * Response shape returned for a single preference row.
     * When a row doesn't exist yet, defaults are used: inApp=true, email=false.
     */
    public record PreferenceResponse(
            UUID id,
            @JsonProperty("user_id")   UUID userId,
            String type,
            @JsonProperty("in_app")    boolean inApp,
            boolean email
    ) {}

    /**
     * Request body for PUT /api/notifications/preferences/{type}
     */
    public record PreferenceUpdateRequest(
            @JsonProperty("in_app") Boolean inApp,
            Boolean email
    ) {}
}
