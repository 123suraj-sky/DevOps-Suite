package com.devopssuite.notification.service;

import com.devopssuite.notification.dto.NotificationPreferenceDto;
import com.devopssuite.notification.dto.NotificationPreferenceDto.PreferenceResponse;
import com.devopssuite.notification.dto.NotificationPreferenceDto.PreferenceUpdateRequest;
import com.devopssuite.notification.model.NotificationPreference;
import com.devopssuite.notification.repository.NotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Manages per-user notification preferences.
 *
 * <p>All supported notification types are defined in {@link #ALL_TYPES}.
 * Calling {@link #getAllForUser} always returns one row per type — missing rows
 * are filled with defaults (inApp=true, email=false) so the frontend can render
 * a complete toggle grid without needing a separate "defaults" endpoint.</p>
 */
@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    /**
     * Canonical set of notification types. Keep in sync with the type strings
     * used in {@link NotificationEventListener}.
     */
    public static final List<String> ALL_TYPES = Arrays.asList(
            "TASK_ASSIGNED",
            "TASK_REASSIGNED",
            "TASK_COMPLETED",
            "PROJECT_JOINED",
            "ROLE_CHANGED",
            "PROJECT_REMOVED",
            "EXECUTION_FAILED"
    );

    private final NotificationPreferenceRepository repository;

    /**
     * Returns preferences for all known types for a user.
     * Types with no stored row are returned with default values.
     */
    @Transactional(readOnly = true)
    public List<PreferenceResponse> getAllForUser(UUID userId) {
        var stored = repository.findByUserId(userId).stream()
                .collect(Collectors.toMap(NotificationPreference::getType, p -> p));

        return ALL_TYPES.stream()
                .map(type -> {
                    NotificationPreference pref = stored.get(type);
                    if (pref != null) {
                        return toResponse(pref);
                    }
                    // Default: in-app on, email off — no row yet
                    return new PreferenceResponse(null, userId, type, true, false);
                })
                .collect(Collectors.toList());
    }

    /**
     * Upserts a preference for a single type.
     * Any fields left null in the request keep their existing (or default) value.
     */
    @Transactional
    public PreferenceResponse upsertPreference(UUID userId, String type, PreferenceUpdateRequest request) {
        if (!ALL_TYPES.contains(type)) {
            throw new IllegalArgumentException("Unknown notification type: " + type);
        }

        NotificationPreference pref = repository.findByUserIdAndType(userId, type)
                .orElseGet(() -> NotificationPreference.builder()
                        .userId(userId)
                        .type(type)
                        .build());

        if (request.inApp() != null) pref.setInApp(request.inApp());
        if (request.email()  != null) pref.setEmail(request.email());

        return toResponse(repository.save(pref));
    }

    /**
     * Returns the effective preference for a given (user, type) pair.
     * If no row exists, returns defaults (inApp=true, email=false).
     */
    @Transactional(readOnly = true)
    public NotificationPreference getEffective(UUID userId, String type) {
        return repository.findByUserIdAndType(userId, type)
                .orElseGet(() -> NotificationPreference.builder()
                        .userId(userId)
                        .type(type)
                        .inApp(true)
                        .email(false)
                        .build());
    }

    // ── Mapping ──────────────────────────────────────────────────────────────

    private PreferenceResponse toResponse(NotificationPreference p) {
        return new PreferenceResponse(p.getId(), p.getUserId(), p.getType(),
                p.isInApp(), p.isEmail());
    }
}
