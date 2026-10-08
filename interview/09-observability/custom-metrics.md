# Custom Application Metrics

> **Category:** Observability | **Difficulty Range:** 🟢 Basic → ⚫ Expert

---

## Introduction

Standard JVM and HTTP metrics (heap, GC, request rate) tell you *how* the system is running. **Custom business metrics** tell you *what* the system is doing — how many code executions are happening, which languages are most popular, how many users are active. DevOps Suite defines **6 custom Micrometer metrics** in `AppMetrics.java` under the `devopssuite.*` namespace, all visible in Grafana's Application Overview dashboard.

---

## Section 1: The 6 Custom Metrics

### `AppMetrics.java` Registration

```java
@Component
public class AppMetrics {

    private final MeterRegistry registry;
    private final Counter executionsTotal;
    private final Counter taskOpsTotal;
    private final Counter cacheHitsTotal;
    private final Counter cacheMissesTotal;
    private final Counter rateLimitBlockedTotal;
    // Gauge is registered differently (tracks a Supplier<Number>)

    public AppMetrics(MeterRegistry registry, RedisCacheService redisCacheService) {
        this.registry = registry;

        this.executionsTotal = Counter.builder("devopssuite.code.executions")
            .description("Total code execution attempts")
            .tag("language", "unknown")  // overridden at call site with withTags()
            .tag("status", "unknown")
            .register(registry);

        this.taskOpsTotal = Counter.builder("devopssuite.task.operations")
            .description("Total task CRUD operations")
            .tag("operation", "unknown")
            .register(registry);

        this.cacheHitsTotal = Counter.builder("devopssuite.cache.hits")
            .description("Cache hit count")
            .tag("cache", "unknown")
            .register(registry);

        this.cacheMissesTotal = Counter.builder("devopssuite.cache.misses")
            .description("Cache miss count")
            .tag("cache", "unknown")
            .register(registry);

        this.rateLimitBlockedTotal = Counter.builder("devopssuite.rate.limit.blocked")
            .description("Requests blocked by rate limiter")
            .tag("endpoint", "unknown")
            .register(registry);

        // Active users gauge — reads from Redis sorted set every scrape
        Gauge.builder("devopssuite.active.users",
                redisCacheService, RedisCacheService::getActiveUserCount)
            .description("Users active in last 5 minutes")
            .register(registry);
    }
}
```

---

## Section 2: Metric-by-Metric Deep Dive

### 1. `devopssuite_code_executions_total`

**Type:** Counter  
**Labels:** `{language="PYTHON|JAVASCRIPT|JAVA|CPP", status="COMPLETED|FAILED|TIMEOUT|OOM_KILLED"}`  
**Incremented in:** `ExecutionQueueWorker.java` after each execution attempt

```java
// In ExecutionQueueWorker.java
registry.counter("devopssuite.code.executions",
    "language", request.getLanguage().name(),
    "status", result.getStatus().name()
).increment();
```

**PromQL examples:**
```promql
# Total executions per minute by language
rate(devopssuite_code_executions_total[1m])

# Failure rate across all languages
sum(rate(devopssuite_code_executions_total{status!="COMPLETED"}[5m]))
/ sum(rate(devopssuite_code_executions_total[5m])) * 100

# Timeout rate for Python specifically
rate(devopssuite_code_executions_total{language="PYTHON", status="TIMEOUT"}[5m])
```

---

### 2. `devopssuite_task_operations_total`

**Type:** Counter  
**Labels:** `{operation="created|updated|deleted|status_changed|moved|duplicated"}`  
**Incremented in:** `TaskService.java` at each write operation

```java
// In TaskService.java
registry.counter("devopssuite.task.operations",
    "operation", "created"
).increment();
```

**PromQL example:**
```promql
# Task creation rate per minute
rate(devopssuite_task_operations_total{operation="created"}[1m])

# Completion rate (tasks moved to DONE)
rate(devopssuite_task_operations_total{operation="status_changed"}[1m])
```

---

### 3. `devopssuite_active_users` (Gauge)

**Type:** Gauge (real-time reading)  
**Labels:** none  
**Backed by:** Redis sorted set `metrics:active_users`

**How it works:**
```java
// In AuthController / JwtRequestFilter — on every authenticated request:
redisTemplate.opsForZSet().add(
    "metrics:active_users",
    userId.toString(),
    System.currentTimeMillis()  // score = epoch ms
);
// Expire old members (> 5 minutes ago)
redisTemplate.opsForZSet().removeRangeByScore(
    "metrics:active_users", 0, System.currentTimeMillis() - 300_000
);

// In RedisCacheService.getActiveUserCount():
return redisTemplate.opsForZSet().zCard("metrics:active_users");
```

The `Gauge` in Micrometer wraps this as a `Supplier<Number>` — every time Prometheus scrapes `/actuator/prometheus`, the gauge calls `getActiveUserCount()` which executes `ZCARD metrics:active_users` on Redis.

**PromQL example:**
```promql
devopssuite_active_users
```

---

### 4. `devopssuite_cache_hits_total` & `devopssuite_cache_misses_total`

**Type:** Counter  
**Labels:** `{cache="user|project"}`  
**Incremented in:** `RedisCacheService.java`

```java
public Optional<UserDto> getCachedUser(UUID userId) {
    String key = "user:" + userId;
    String cached = redisTemplate.opsForValue().get(key);
    if (cached != null) {
        registry.counter("devopssuite.cache.hits", "cache", "user").increment();
        return Optional.of(objectMapper.readValue(cached, UserDto.class));
    }
    registry.counter("devopssuite.cache.misses", "cache", "user").increment();
    return Optional.empty();
}
```

**Cache hit ratio PromQL:**
```promql
# Cache hit ratio for user cache (%)
rate(devopssuite_cache_hits_total{cache="user"}[5m])
/ (rate(devopssuite_cache_hits_total{cache="user"}[5m])
   + rate(devopssuite_cache_misses_total{cache="user"}[5m])) * 100
```

---

### 5. `devopssuite_rate_limit_blocked_total`

**Type:** Counter  
**Labels:** `{endpoint="/api/auth/login|/api/code-execution/run|other"}`  
**Incremented in:** `RateLimitFilter.java` when returning 429

```java
// In RateLimitFilter.java, when limit exceeded:
registry.counter("devopssuite.rate.limit.blocked",
    "endpoint", normalizeEndpoint(request.getRequestURI())
).increment();
```

**PromQL examples:**
```promql
# Rate limit blocks per minute (all endpoints)
rate(devopssuite_rate_limit_blocked_total[1m])

# Security view: auth brute force attempts
rate(devopssuite_rate_limit_blocked_total{endpoint="/api/auth/login"}[5m])
```

---

## Section 3: Micrometer Primitives

### Counter vs Gauge vs Timer

| Primitive | Use Case | Behavior | Example |
|---|---|---|---|
| **Counter** | Counting events | Only increases, never decreases | Executions, task ops, cache hits |
| **Gauge** | Current state reading | Fluctuates up and down | Active users, queue depth |
| **Timer** | Duration of operations | Records duration + count | Method execution time |
| **DistributionSummary** | Distribution of values | Like Timer but for non-time values | Request payload size |

**When to use Gauge vs Counter:**

- Use **Counter** when: you're counting discrete events (logins, requests, errors)
- Use **Gauge** when: you're measuring a snapshot of current state (queue length, connected users, heap size)

**Gauge pitfall — memory leak:**
```java
// ❌ DANGEROUS: List reference held in Gauge prevents GC
List<Task> pendingTasks = new ArrayList<>();
Gauge.builder("pending_tasks", pendingTasks, List::size).register(registry);

// ✅ SAFE: WeakReference allows GC
Gauge.builder("pending_tasks", pendingTasks, c -> ((WeakReference<List<?>>) c).get().size())
     .register(registry);
```

---

## Section 4: Grafana Visualization

### Application Overview Dashboard Panels

```promql
# Panel: Executions by Language (bar chart)
sum by (language) (rate(devopssuite_code_executions_total[5m]))

# Panel: Execution Success vs Failure (pie chart)
sum by (status) (rate(devopssuite_code_executions_total[5m]))

# Panel: Cache Efficiency (stat panel)
(
  sum(rate(devopssuite_cache_hits_total[5m]))
  / (sum(rate(devopssuite_cache_hits_total[5m])) + sum(rate(devopssuite_cache_misses_total[5m])))
) * 100

# Panel: Security Incidents (alert-colored stat)
sum(rate(devopssuite_rate_limit_blocked_total[5m])) * 60
```

---

## Section 5: Interview Q&A

### 🟢 Basic

**Q: What is Micrometer and why does Spring Boot use it instead of directly using Prometheus client libraries?**

**A:** Micrometer is a **metrics facade** — similar to SLF4J for logging. It provides a vendor-neutral API for recording metrics, and then pluggable **registry implementations** format and export to specific backends (Prometheus, Datadog, New Relic, CloudWatch, etc.).

Benefits:
- Application code depends only on `io.micrometer:micrometer-core`
- Switch backend by adding a different registry dependency (no code changes)
- Spring Boot auto-configures the registry based on classpath

---

**Q: What is the difference between a Counter and a Gauge in Micrometer?**

**A:**
- **Counter:** Monotonically increasing — only ever goes up. Represents the *total count of events* since application start. Use with PromQL `rate()` to get events/second.
- **Gauge:** Point-in-time snapshot — can go up and down. Represents the *current value* of something. Use directly in PromQL (no `rate()`).

```java
// Counter — counts code executions (only increases)
Counter.builder("devopssuite.code.executions").register(registry).increment();

// Gauge — measures active users RIGHT NOW (fluctuates)
Gauge.builder("devopssuite.active.users", service, Service::getActiveCount).register(registry);
```

---

### 🟡 Intermediate

**Q: How do you prevent high cardinality from breaking Prometheus when adding custom metrics?**

**A:** Cardinality = unique label value combinations. Every unique combination creates a separate time series. High cardinality → Prometheus OOM or degraded performance.

**In DevOps Suite:**
- `language` tag: 4 values (PYTHON, JAVASCRIPT, JAVA, CPP) ✅
- `status` tag: 5 values (QUEUED, RUNNING, COMPLETED, FAILED, TIMEOUT) ✅
- Total series for `devopssuite_code_executions_total`: 4 × 5 = 20 ✅

**High cardinality anti-patterns to avoid:**
```java
// ❌ user_id has millions of values → millions of time series
counter.tag("user_id", userId.toString()).increment();

// ❌ request_id is unique per request → unbounded
counter.tag("request_id", requestId).increment();

// ✅ bounded enums only
counter.tag("language", language.name()).tag("status", status.name()).increment();
```

---

### 🔴 Advanced

**Q: How does the active users gauge avoid double-counting when multiple application instances are running?**

**A:** Because the `devopssuite_active_users` gauge reads from a **shared Redis sorted set** (`metrics:active_users`), not from in-memory JVM state, it naturally handles multiple instances:

- Any instance that receives a request adds the userId to the Redis ZSET
- Any instance that Prometheus scrapes reads the same Redis ZSET
- There is exactly **one source of truth** — Redis

This means even with 3 backend instances behind a load balancer, `devopssuite_active_users` reports the correct total. An in-JVM counter (like `AtomicLong`) would give only per-instance counts.

**Contrast with per-instance counters:**
```promql
# Per-instance counter — shows per-pod data, not total
devopssuite_code_executions_total{instance="backend-1:8081"}

# Sum across all instances with Prometheus multi-instance scraping
sum(devopssuite_code_executions_total)
```

---

### ⚫ Expert

**Q: The `devopssuite_active_users` gauge is called on every Prometheus scrape (every 15 seconds). If Redis is slow, this blocks the scrape thread. How would you fix this?**

**A:** This is a real Micrometer Gauge pitfall — synchronous reads inside a Gauge block the Actuator thread that generates Prometheus output.

**Solution: Scheduled refresh into an AtomicLong:**

```java
@Component
public class AppMetrics {

    private final AtomicLong activeUsersSnapshot = new AtomicLong(0);

    @PostConstruct
    public void init() {
        // Gauge reads from AtomicLong — never blocks
        Gauge.builder("devopssuite.active.users", activeUsersSnapshot, AtomicLong::get)
             .register(registry);
    }

    // Refresh from Redis on a separate scheduled thread every 30 seconds
    @Scheduled(fixedDelay = 30_000)
    public void refreshActiveUsers() {
        try {
            long count = redisCacheService.getActiveUserCount();
            activeUsersSnapshot.set(count);
        } catch (Exception e) {
            log.warn("Failed to refresh active users metric", e);
            // Keep stale value — don't set to 0
        }
    }
}
```

This pattern:
1. Decouples Redis latency from Prometheus scrape latency
2. Makes the gauge read O(1) — just an `AtomicLong.get()`
3. Handles Redis failures gracefully (stale value vs crash)
4. Makes metric values up to 30s stale — acceptable for active user counts

---

## Quick Reference

| Metric Name | Type | Labels | Incremented In |
|---|---|---|---|
| `devopssuite_code_executions_total` | Counter | `{language, status}` | `ExecutionQueueWorker` |
| `devopssuite_task_operations_total` | Counter | `{operation}` | `TaskService` |
| `devopssuite_active_users` | Gauge | (none) | Scheduled Redis read |
| `devopssuite_cache_hits_total` | Counter | `{cache}` | `RedisCacheService` |
| `devopssuite_cache_misses_total` | Counter | `{cache}` | `RedisCacheService` |
| `devopssuite_rate_limit_blocked_total` | Counter | `{endpoint}` | `RateLimitFilter` |

| Concept | Rule |
|---|---|
| Counter vs Gauge | Counter = monotonic events; Gauge = current state snapshot |
| Cardinality safety | Only use bounded enums as labels (not user IDs, request IDs) |
| Gauge thread safety | Use `AtomicLong` + scheduled refresh instead of blocking DB/Redis call |
| PromQL for rate | Always wrap Counter queries in `rate(...[interval])` |
| Namespace | All custom metrics use `devopssuite.*` prefix |


---

## Section 6: Advanced Instrumentations & Custom Micrometer Timers

### Tracking Execution Latency with `Timer`

While Counters track cumulative invocations, measuring code execution duration and percentile latencies requires Micrometer `Timer`:

```java
@Component
public class ExecutionMetricsService {

    private final MeterRegistry registry;
    private final Timer codeExecutionTimer;

    public ExecutionMetricsService(MeterRegistry registry) {
        this.registry = registry;
        this.codeExecutionTimer = Timer.builder("devopssuite.code.execution.duration")
            .description("Time taken to run code sandbox containers")
            .publishPercentiles(0.5, 0.95, 0.99)
            .publishPercentileHistogram()
            .minimumExpectedValue(Duration.ofMillis(100))
            .maximumExpectedValue(Duration.ofSeconds(35))
            .register(registry);
    }

    public <T> T recordExecution(Supplier<T> executionBlock, String language) {
        return Timer.builder("devopssuite.code.execution.duration")
            .tag("language", language)
            .publishPercentiles(0.95, 0.99)
            .register(registry)
            .record(executionBlock);
    }
}
```

PromQL to query p95 sandbox execution latency across languages:
```promql
histogram_quantile(0.95, sum by (le, language) (rate(devopssuite_code_execution_duration_seconds_bucket[5m])))
```

---

## Section 7: DistributionSummary for Resource Usage

For tracking payload sizes (e.g., uploaded code snippets, virtual file sizes), `DistributionSummary` tracks distributions of non-time dimensions:

```java
DistributionSummary filePayloadSummary = DistributionSummary.builder("devopssuite.ide.file.bytes")
    .description("Size of files submitted to the IDE")
    .baseUnit("bytes")
    .scale(1.0)
    .register(registry);

filePayloadSummary.record(sourceCode.getBytes(StandardCharsets.UTF_8).length);
```

---

## Section 8: Memory & Thread Safety Deep Dive

### Thread Safety of Metric Registries

Micrometer `Counter` and `Timer` classes are backed by concurrent data structures (`LongAdder` and `Striped64` cells). Unlike standard atomic primitives (`AtomicLong`) that incur cache-line invalidation under heavy contention, `LongAdder` maintains a distributed array of counters, reducing thread contention to near zero across high concurrency.

### Metric Lifecycle & Unregistering

In dynamic multi-tenant workloads or long-running applications, registering metrics with dynamic tags without cleanup leads to metric accumulation in the registry. DevOps Suite avoids dynamic registration loops by strictly declaring all meters in `@PostConstruct` or constructor bodies with static tags, referencing state through stable suppliers.
