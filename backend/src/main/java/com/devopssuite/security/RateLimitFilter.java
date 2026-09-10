package com.devopssuite.security;

import com.devopssuite.metrics.AppMetrics;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Redis-backed fixed-window rate limiter implemented as a Servlet filter.
 *
 * <h3>Strategy</h3>
 * Uses INCR + conditional EXPIRE on keys scoped to a per-identity, per-tier,
 * per-window bucket. Limits and window duration are configured via
 * {@link RateLimitProperties} (overridable through environment variables).
 *
 * <h3>Rate-limit tiers</h3>
 * <pre>
 *   Tier        URI prefix                   Default limit (per 60 s window)
 *   ──────────────────────────────────────────────────────────────────────────
 *   execution   /api/code-execution/run      10   (RATE_LIMIT_EXECUTION_MAX)
 *   auth        /api/auth/login|register     20   (RATE_LIMIT_AUTH_MAX)
 *   api         everything else              300  (RATE_LIMIT_API_MAX)
 * </pre>
 *
 * <h3>Identity</h3>
 * Authenticated requests → userId; unauthenticated → remote IP (with
 * X-Forwarded-For header support).
 *
 * <p>All Redis errors fail open so a Redis outage never blocks legitimate
 * traffic.</p>
 */
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final StringRedisTemplate redisTemplate;
    private final AppMetrics appMetrics;
    private final RateLimitProperties props;
    private final ObjectMapper mapper = new ObjectMapper();

    public RateLimitFilter(StringRedisTemplate redisTemplate,
                           AppMetrics appMetrics,
                           RateLimitProperties props) {
        this.redisTemplate = redisTemplate;
        this.appMetrics    = appMetrics;
        this.props         = props;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();

        // Resolve tier
        String tier;
        int limit;
        if (isExecutionEndpoint(uri)) {
            tier  = "execution";
            limit = props.getExecutionMax();
        } else if (isAuthEndpoint(uri)) {
            tier  = "auth";
            limit = props.getAuthMax();
        } else {
            tier  = "api";
            limit = props.getApiMax();
        }

        String identity = resolveIdentity(request);
        long bucket     = System.currentTimeMillis() / 1000 / props.getWindowSeconds();
        String key      = "rate:" + tier + ":" + identity + ":" + bucket;

        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                // First request in this window — set expiry (window + 5 s buffer)
                redisTemplate.expire(key, props.getWindowSeconds() + 5, TimeUnit.SECONDS);
            }

            if (count != null && count > limit) {
                appMetrics.recordRateLimitBlock(tier);
                log.warn("Rate limit exceeded: tier={} identity={} count={} limit={}", tier, identity, count, limit);
                writeRateLimitResponse(response, tier, limit);
                return;
            }
        } catch (Exception e) {
            // Redis failure — fail open
            log.debug("Rate limit Redis error (failing open): {}", e.getMessage());
        }

        chain.doFilter(request, response);
    }

    // ── URI classifiers ──────────────────────────────────────────────────────

    private boolean isExecutionEndpoint(String uri) {
        return uri.startsWith("/api/code-execution/run")
            || uri.startsWith("/api/code-execution/execute");
    }

    private boolean isAuthEndpoint(String uri) {
        return uri.startsWith("/api/auth/login")
            || uri.startsWith("/api/auth/register")
            || uri.startsWith("/auth/login")
            || uri.startsWith("/auth/register");
    }

    // ── Identity resolution ──────────────────────────────────────────────────

    private String resolveIdentity(HttpServletRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()
                    && auth.getPrincipal() instanceof String principal
                    && !principal.equals("anonymousUser")) {
                return "uid:" + principal;
            }
        } catch (Exception ignored) {}

        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            ip = ip.split(",")[0].trim();
        }
        if (ip == null || ip.isBlank()) {
            ip = request.getRemoteAddr();
        }
        return "ip:" + (ip != null ? ip : "unknown");
    }

    // ── Response writer ──────────────────────────────────────────────────────

    private void writeRateLimitResponse(HttpServletResponse response, String tier, int limit)
            throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", String.valueOf(props.getWindowSeconds()));
        response.setHeader("X-RateLimit-Tier", tier);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 429);
        body.put("error", "Too Many Requests");
        body.put("message", "Rate limit exceeded for tier '" + tier + "'. Max " + limit
                + " requests per " + props.getWindowSeconds() + "s window.");
        body.put("retryAfterSeconds", props.getWindowSeconds());
        response.getWriter().write(mapper.writeValueAsString(body));
    }

    // ── Skip list ────────────────────────────────────────────────────────────

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri.startsWith("/actuator/health")
            || uri.startsWith("/uploads/")
            || uri.startsWith("/ws/")
            || uri.equals("/")
            || uri.startsWith("/assets/")
            || uri.startsWith("/static/");
    }
}
