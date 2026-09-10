package com.devopssuite.metrics;

import io.micrometer.core.instrument.*;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Central registry for all custom DevOps Suite Micrometer metrics.
 *
 * <p>All metric names use the {@code devopssuite.*} prefix to avoid
 * collisions with Spring Boot auto-instrumentation.</p>
 *
 * <h3>Metric catalogue</h3>
 * <pre>
 *   devopssuite_code_executions_total{language, status}  — Counter
 *   devopssuite_task_operations_total{operation}          — Counter
 *   devopssuite_active_users                              — Gauge  (5-min sliding window)
 *   devopssuite_cache_hits_total{cache}                   — Counter
 *   devopssuite_cache_misses_total{cache}                 — Counter
 *   devopssuite_rate_limit_blocked_total{endpoint}        — Counter
 * </pre>
 */
@Component
@RequiredArgsConstructor
public class AppMetrics {

    private final MeterRegistry registry;

    // ── Active users gauge backing value ────────────────────────────────────
    @Getter
    private final AtomicLong activeUserCount = new AtomicLong(0);

    @PostConstruct
    private void registerGauges() {
        Gauge.builder("devopssuite.active.users", activeUserCount, AtomicLong::get)
                .description("Number of distinct authenticated users seen in the last 5 minutes")
                .register(registry);
    }

    // ── Code executions ──────────────────────────────────────────────────────

    /**
     * Increment the code-execution counter.
     *
     * @param language canonical language name (e.g. "python", "java")
     * @param status   terminal status (COMPLETED, FAILED, TIMEOUT, OOM_KILLED)
     */
    public void recordExecution(String language, String status) {
        Counter.builder("devopssuite.code.executions")
                .description("Total sandbox code executions by language and terminal status")
                .tag("language", language != null ? language : "unknown")
                .tag("status", status != null ? status : "unknown")
                .register(registry)
                .increment();
    }

    // ── Task operations ──────────────────────────────────────────────────────

    /**
     * Increment the task-operation counter.
     *
     * @param operation one of: created, updated, deleted, moved, completed
     */
    public void recordTaskOperation(String operation) {
        Counter.builder("devopssuite.task.operations")
                .description("Total Kanban task operations by type")
                .tag("operation", operation != null ? operation : "unknown")
                .register(registry)
                .increment();
    }

    // ── Cache ────────────────────────────────────────────────────────────────

    /**
     * Record a cache hit.
     *
     * @param cacheName logical cache name (e.g. "user", "project")
     */
    public void recordCacheHit(String cacheName) {
        Counter.builder("devopssuite.cache.hits")
                .description("Redis cache hits by cache name")
                .tag("cache", cacheName)
                .register(registry)
                .increment();
    }

    /**
     * Record a cache miss (data was loaded from the DB).
     *
     * @param cacheName logical cache name (e.g. "user", "project")
     */
    public void recordCacheMiss(String cacheName) {
        Counter.builder("devopssuite.cache.misses")
                .description("Redis cache misses by cache name")
                .tag("cache", cacheName)
                .register(registry)
                .increment();
    }

    // ── Rate limiting ────────────────────────────────────────────────────────

    /**
     * Record a rate-limit block (HTTP 429 returned to a client).
     *
     * @param endpoint logical endpoint descriptor (e.g. "/api/code-execution/run")
     */
    public void recordRateLimitBlock(String endpoint) {
        Counter.builder("devopssuite.rate.limit.blocked")
                .description("Total requests blocked by Redis rate limiting")
                .tag("endpoint", endpoint != null ? endpoint : "unknown")
                .register(registry)
                .increment();
    }
}
