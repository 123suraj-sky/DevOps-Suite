package com.devopssuite.config;

import com.devopssuite.metrics.AppMetrics;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Generic Redis cache-aside helper.
 *
 * <p>All cache operations are wrapped in try/catch so a Redis outage
 * never propagates to callers — the supplier (DB query) is used as
 * fallback in every error path.</p>
 *
 * <p>TTLs:</p>
 * <ul>
 *   <li>user profile  — 30 minutes</li>
 *   <li>project       — 15 minutes</li>
 * </ul>
 */
@Service
@Slf4j
public class RedisCacheService {

    public static final long USER_TTL_MINUTES    = 30;
    public static final long PROJECT_TTL_MINUTES = 15;

    private final StringRedisTemplate redis;
    private final AppMetrics appMetrics;
    private final ObjectMapper mapper;

    public RedisCacheService(StringRedisTemplate redis, AppMetrics appMetrics) {
        this.redis      = redis;
        this.appMetrics = appMetrics;
        this.mapper     = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Cache-aside read. Returns the cached value when present; otherwise calls
     * {@code loader}, stores the result in Redis with the given TTL, and returns it.
     *
     * @param key       Redis key
     * @param cacheName logical name used for cache-hit/miss metrics (e.g. "user")
     * @param ttlMinutes TTL for new entries
     * @param typeRef   Jackson type for deserialization
     * @param loader    DB supplier, only called on cache miss
     * @param <T>       value type
     */
    public <T> T getOrLoad(String key, String cacheName, long ttlMinutes,
                           TypeReference<T> typeRef, Supplier<T> loader) {
        // ── Try cache ──
        try {
            String cached = redis.opsForValue().get(key);
            if (cached != null) {
                appMetrics.recordCacheHit(cacheName);
                return mapper.readValue(cached, typeRef);
            }
        } catch (Exception e) {
            log.debug("[cache] Read error for key={}: {}", key, e.getMessage());
        }

        // ── Cache miss: load from DB ──
        appMetrics.recordCacheMiss(cacheName);
        T value = loader.get();

        // ── Populate cache ──
        try {
            String serialized = mapper.writeValueAsString(value);
            redis.opsForValue().set(key, serialized, ttlMinutes, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.debug("[cache] Write error for key={}: {}", key, e.getMessage());
        }

        return value;
    }

    /**
     * Evict a single key. Silent on error.
     */
    public void evict(String key) {
        try {
            redis.delete(key);
        } catch (Exception e) {
            log.debug("[cache] Evict error for key={}: {}", key, e.getMessage());
        }
    }

    // ── Convenience key builders ─────────────────────────────────────────────

    public static String userKey(String userId)       { return "user:" + userId; }
    public static String projectKey(String projectId) { return "project:" + projectId; }
}
