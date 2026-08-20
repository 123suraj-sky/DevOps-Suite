package com.devopssuite.logging.filter;

import com.devopssuite.logging.event.LogEvent;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Intercepts every HTTP request, measures duration, and publishes a {@link LogEvent}
 * for downstream consumers (Elasticsearch indexer, WebSocket streamer).
 *
 * Project ID extraction: matches /api/v1/projects/{uuid}/... or /api/projects/{uuid}/...
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Pattern PROJECT_PATTERN =
            Pattern.compile("/projects/([0-9a-fA-F\\-]{36})");

    private final ApplicationEventPublisher eventPublisher;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        long start = System.currentTimeMillis();

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - start;
            String userId = extractUserId();
            UUID projectId = extractProjectId(request.getRequestURI());

            LogEvent event = new LogEvent(
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus(),
                    duration,
                    userId,
                    projectId,
                    Instant.now()
            );

            try {
                eventPublisher.publishEvent(event);
            } catch (Exception e) {
                log.warn("Failed to publish LogEvent: {}", e.getMessage());
            }
        }
    }

    private String extractUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() != null) {
                Object principal = auth.getPrincipal();
                if (principal instanceof org.springframework.security.core.userdetails.UserDetails ud) {
                    return ud.getUsername();
                }
                return principal.toString();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private UUID extractProjectId(String uri) {
        if (uri == null) return null;
        try {
            Matcher m = PROJECT_PATTERN.matcher(uri);
            if (m.find()) {
                return UUID.fromString(m.group(1));
            }
        } catch (Exception ignored) {}
        return null;
    }
}
