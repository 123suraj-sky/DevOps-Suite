package com.devopssuite.config;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Supplies the currently authenticated user's UUID to Spring Data JPA Auditing.
 * Used to populate @CreatedBy and @LastModifiedBy fields on audited entities.
 * Returns Optional.empty() for unauthenticated or non-UUID principals (e.g. during tests/seeding).
 */
@Component("securityAuditorAware")
public class SecurityAuditorAware implements AuditorAware<UUID> {

    @Override
    public Optional<UUID> getCurrentAuditor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof String)) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString((String) principal));
        } catch (IllegalArgumentException e) {
            // Principal is a non-UUID string (e.g. "anonymousUser")
            return Optional.empty();
        }
    }
}
