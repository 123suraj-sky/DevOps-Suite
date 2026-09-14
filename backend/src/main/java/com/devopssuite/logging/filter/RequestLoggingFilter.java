package com.devopssuite.logging.filter;

import com.devopssuite.logging.event.LogEvent;
import com.devopssuite.metrics.AppMetrics;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Intercepts every HTTP request, measures duration, and publishes a {@link LogEvent}
 * for downstream consumers (Elasticsearch indexer, WebSocket streamer).
 *
 * <p>Also tracks distinct authenticated users in a Redis sorted set
 * ({@code metrics:active_users}) with a 5-minute sliding window. A scheduled
 * task refreshes the {@link AppMetrics#getActiveUserCount()} gauge every 30 s.</p>
 *
 * Project ID extraction: matches /api/v1/projects/{uuid}/... or /api/projects/{uuid}/...
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Pattern PROJECT_PATTERN =
            Pattern.compile("/projects/([0-9a-fA-F\\-]{36})");

    /** Redis key for the active-users sorted set. Score = epoch millis of last seen. */
    private static final String ACTIVE_USERS_KEY = "metrics:active_users";

    /** Window in milliseconds (5 minutes). */
    private static final long WINDOW_MS = 5 * 60 * 1_000L;

    private final ApplicationEventPublisher eventPublisher;
    private final StringRedisTemplate redisTemplate;
    private final AppMetrics appMetrics;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        long start = System.currentTimeMillis();

        String traceId = resolveTraceId(request);
        org.slf4j.MDC.put("traceId", traceId);
        response.setHeader("X-Trace-Id", traceId);

        try {
            filterChain.doFilter(request, response);
        } catch (Throwable t) {
            if (request.getAttribute("log_error_message") == null) {
                request.setAttribute("log_error_message", t.getMessage());
            }
            if (request.getAttribute("log_error_class") == null) {
                request.setAttribute("log_error_class", t.getClass().getSimpleName());
            }
            throw t;
        } finally {
            long duration = System.currentTimeMillis() - start;
            String userId = extractUserId();
            UUID projectId = extractProjectId(request);

            // Track active users in a Redis sorted set (score = epoch millis)
            if (userId != null && !userId.equals("anonymousUser")) {
                try {
                    double nowMillis = System.currentTimeMillis();
                    redisTemplate.opsForZSet().add(ACTIVE_USERS_KEY, userId, nowMillis);
                    redisTemplate.expire(ACTIVE_USERS_KEY, 10, TimeUnit.MINUTES);
                } catch (Exception e) {
                    log.debug("Failed to update active-users set in Redis: {}", e.getMessage());
                }
            }

            int status = response.getStatus();
            String level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
            String clientIp = extractClientIp(request);
            String userAgent = request.getHeader("User-Agent");

            String errorMessage = (String) request.getAttribute("log_error_message");
            String errorClass = (String) request.getAttribute("log_error_class");

            LogEvent event = LogEvent.builder()
                    .method(request.getMethod())
                    .uri(request.getRequestURI())
                    .status(status)
                    .durationMs(duration)
                    .userId(userId)
                    .projectId(projectId)
                    .timestamp(Instant.now())
                    .level(level)
                    .traceId(traceId)
                    .clientIp(clientIp)
                    .userAgent(userAgent)
                    .errorMessage(errorMessage)
                    .errorClass(errorClass)
                    .eventType("HTTP")
                    .build();

            try {
                eventPublisher.publishEvent(event);
            } catch (Exception e) {
                log.warn("Failed to publish LogEvent: {}", e.getMessage());
            } finally {
                org.slf4j.MDC.remove("traceId");
            }
        }
    }

    private String resolveTraceId(HttpServletRequest request) {
        String traceId = request.getHeader("X-Trace-Id");
        if (traceId == null || traceId.isBlank()) {
            traceId = request.getHeader("X-Correlation-Id");
        }
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        }
        return traceId.trim();
    }

    private String extractClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            int commaIdx = ip.indexOf(',');
            return (commaIdx != -1 ? ip.substring(0, commaIdx) : ip).trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
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

    /**
     * Extracts the project UUID from the request.
     * Strategy (in priority order):
     *  1. URL pattern: /projects/{uuid}/...
     *  2. X-Project-Id request header (set by the frontend for task / execution calls)
     */
    private UUID extractProjectId(HttpServletRequest request) {
        if (request == null) return null;
        try {
            // 1. URL-based extraction
            String uri = request.getRequestURI();
            if (uri != null) {
                Matcher m = PROJECT_PATTERN.matcher(uri);
                if (m.find()) {
                    return UUID.fromString(m.group(1));
                }
            }
            // 2. Header-based fallback
            String headerValue = request.getHeader("X-Project-Id");
            if (headerValue != null && !headerValue.isBlank()) {
                return UUID.fromString(headerValue.trim());
            }
        } catch (Exception ignored) {}
        return null;
    }

    /**
     * Every 30 seconds: remove stale entries from the sorted set (older than 5 min)
     * and update the gauge backing value.
     */
    @Scheduled(fixedDelay = 30_000)
    public void refreshActiveUsersGauge() {
        try {
            long cutoff = System.currentTimeMillis() - WINDOW_MS;
            redisTemplate.opsForZSet().removeRangeByScore(ACTIVE_USERS_KEY, 0, cutoff);
            Long count = redisTemplate.opsForZSet().zCard(ACTIVE_USERS_KEY);
            appMetrics.getActiveUserCount().set(count != null ? count : 0L);
        } catch (Exception e) {
            log.debug("Failed to refresh active-users gauge: {}", e.getMessage());
        }
    }
}
