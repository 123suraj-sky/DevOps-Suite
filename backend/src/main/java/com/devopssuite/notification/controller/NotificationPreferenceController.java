package com.devopssuite.notification.controller;

import com.devopssuite.notification.dto.NotificationPreferenceDto.PreferenceResponse;
import com.devopssuite.notification.dto.NotificationPreferenceDto.PreferenceUpdateRequest;
import com.devopssuite.notification.service.NotificationPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST endpoints for per-user notification preferences.
 *
 * <pre>
 * GET  /api/notifications/preferences          → list all preferences (one per type)
 * PUT  /api/notifications/preferences/{type}   → upsert a single preference
 * </pre>
 */
@RestController
@RequestMapping({"/notifications/preferences", "/api/notifications/preferences"})
@RequiredArgsConstructor
public class NotificationPreferenceController {

    private final NotificationPreferenceService preferenceService;

    private UUID getCurrentUserId() {
        org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new org.springframework.security.authentication.AuthenticationCredentialsNotFoundException("Authentication is required");
        }
        return UUID.fromString((String) auth.getPrincipal());
    }

    /**
     * Returns the full preferences list for the authenticated user.
     * Every known type is returned; types with no stored row use defaults.
     */
    @GetMapping
    public ResponseEntity<List<PreferenceResponse>> getPreferences() {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(preferenceService.getAllForUser(userId));
    }

    /**
     * Creates or updates the preference for a single notification type.
     *
     * <p>Only the fields provided in the request body are changed.
     * For example, sending {@code {"email": true}} will enable email
     * without touching the {@code in_app} setting.</p>
     */
    @PutMapping("/{type}")
    public ResponseEntity<PreferenceResponse> updatePreference(
            @PathVariable String type,
            @RequestBody PreferenceUpdateRequest request) {

        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(preferenceService.upsertPreference(userId, type.toUpperCase(), request));
    }
}
