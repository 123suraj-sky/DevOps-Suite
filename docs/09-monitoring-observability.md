# Monitoring and Observability — DevOps Suite

## 1. Overview

The observability stack is fully implemented. The monolith exposes Prometheus metrics, indexes structured logs to Elasticsearch, and auto-provisions Kibana dashboards on startup. All infrastructure observability tools are protected behind an nginx admin proxy.

---

## 2. Monitoring Architecture

```
Spring Boot Monolith (port 8081)
    │
    ├── /actuator/prometheus ──────► Prometheus (internal:9090)
    │                                     │
    │                               Grafana (nginx → :8080)
    │
    ├── RequestLoggingFilter ──────► ElasticsearchLogService
    │   (every HTTP request)              │
    │                               Elasticsearch (internal:9200)
    │                                     │
    │                               kibana-init container
    │                               (auto-provisions on startup)
    │                                     │
    │                               Kibana (nginx → :8083)
```

---

## 3. Structured Logging Pipeline

Every HTTP request is intercepted by `RequestLoggingFilter` (in `com.devopssuite.logging.filter`) and indexed to Elasticsearch via `ElasticsearchLogService`.

### Index Pattern
`devopssuite-logs-yyyy.MM.dd` (daily rolling indices)

### Log Fields (per document)

| Field | Type | Description |
|---|---|---|
| `@timestamp` | DateTime | Request timestamp |
| `method` | String | HTTP method (GET, POST, …) |
| `path` | String | Request path |
| `status` | Integer | HTTP response status code |
| `duration` | Long | Response time in milliseconds |
| `userId` | String | Authenticated user UUID |
| `projectId` | String | Project ID from `X-Project-Id` header |
| `severity` | String | INFO / WARN / ERROR |
| `traceId` | String | Correlation ID from `X-Trace-Id` header or MDC |
| `clientIp` | String | Client IP from `X-Forwarded-For` |
| `userAgent` | String | Browser/client user agent |
| `errorMessage` | String | Exception message (error responses only) |
| `errorClass` | String | Exception class name (error responses only) |
| `exitCode` | Integer | Docker sandbox exit code (execution requests only) |
| `timedOut` | Boolean | Whether execution timed out |
| `oomKilled` | Boolean | Whether execution was OOM killed |
| `language` | String | Code execution language |
| `eventType` | String | Domain audit event type (e.g., `TASK_ASSIGNED`, `PROJECT_CREATED`) |

### ILM Retention Policy
- Index Lifecycle Management (ILM) policy: `devopssuite_logs_retention_policy`
- Indices older than **180 days** are automatically deleted
- Provisioned via `config/kibana/init-kibana.sh` at stack startup

---

## 4. Kibana Auto-Provisioning

The `kibana-init` Docker container runs `config/kibana/init-kibana.sh` on every stack startup and provisions:

| Resource | Name |
|---|---|
| Data view | `devopssuite-logs-*` |
| Dashboard | **Observability** — request throughput, latency, error rate over time |
| Dashboard | **Security** — auth failures, rate limit hits, suspicious IPs |
| Dashboard | **Analytics** — code execution stats by language, project activity |
| Saved search | Recent errors (status ≥ 500) |
| ILM policy | `devopssuite_logs_retention_policy` (180-day retention) |
| Index template | `devopssuite_logs_template` |

---

## 5. Prometheus + Grafana

### Scrape Configuration
Prometheus scrapes `/actuator/prometheus` on the backend every 15 seconds.

### Key Metrics Exposed (via Micrometer / Spring Actuator)
- `http_server_requests_seconds` — request count + latency by method/status/uri
- `jvm_memory_used_bytes` — JVM heap/non-heap memory usage
- `jvm_gc_pause_seconds` — garbage collection timing
- `hikaricp_connections` — HikariCP connection pool stats
- `redis_commands_duration_seconds` — Redis operation latency
- `process_cpu_usage` — CPU usage
- Custom: `execution_requests_total`, `execution_duration_seconds` (via `AppMetrics.java`)

### Grafana Access
URL: `http://localhost:8080` (via nginx admin proxy, requires Basic Auth)  
Set `ADMIN_PASSWORD` in `.env` before `docker-compose up`.

---

## 6. Health Checks (Actuator)

| Endpoint | Access | Returns |
|---|---|---|
| `GET /actuator/health` | Public (no auth) | `{ "status": "UP" }` or `DOWN` with component detail |
| `GET /actuator/health/db` | Admin only | PostgreSQL health |
| `GET /actuator/health/redis` | Admin only | Redis health |
| `GET /actuator/prometheus` | Admin only | Full Prometheus metrics |
| `GET /actuator/info` | Admin only | App version info |
| `GET /api/metrics/dashboard` | Admin only | Dashboard aggregates (platform stats + health) |
| `GET /api/metrics/user-summary` | Any authenticated user | Personal activity stats |

---

## 7. Real-Time Log Streaming (WebSocket)

In addition to Elasticsearch indexing, logs are streamed live to the frontend via WebSocket:

- **Topic:** `/topic/logs/{projectId}`
- **Source:** `RequestLoggingFilter` reads `X-Project-Id` header; `ExecutionQueueWorker` publishes `LogEvent` after sandbox completes
- **Frontend:** `LogsPage` subscribes to this topic and displays colored entries in real-time

---

## 8. Admin Access — nginx Proxy

All observability tools are **not directly exposed** to the host. They are protected behind an nginx reverse proxy with HTTP Basic Auth:

| Tool | External URL | Auth |
|---|---|---|
| Grafana | `http://localhost:8080` | Basic Auth (`admin` / `ADMIN_PASSWORD`) |
| Kibana | `http://localhost:8083` | Basic Auth (`admin` / `ADMIN_PASSWORD`) |

Configure `ADMIN_PASSWORD` in `.env` before starting the stack.

---

## 9. Alerting & Dashboards

- **Grafana Dashboards:** Track overall system throughput (RPM), latency (p50/p95/p99), database pool utilization, and rate-limiting blocks
- **Alert Rules:** Grafana alerts can be configured for high error rates, pod unresponsiveness, or connection pool saturation
- **Kibana Dashboards:** Pre-provisioned dashboards for Observability, Security, and Analytics

---

## 10. Audit Event Logging

Domain-level audit events are recorded via `AuditLogEventListener` and stored in Elasticsearch alongside HTTP request logs:

| Event Type | Trigger |
|---|---|
| `USER_REGISTERED` | New user registration |
| `USER_LOGIN` | Successful login |
| `PROJECT_CREATED` | New project creation |
| `TASK_ASSIGNED` | Task assigned to a user |
| `TASK_COMPLETED` | Task moved to DONE status |
| `CODE_EXECUTION_COMPLETED` | Sandbox execution finished |
| `CODE_EXECUTION_FAILED` | Sandbox execution failed / timed out |
