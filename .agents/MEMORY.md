# MEMORY.md — Persistent Agent Memory

> **Updated by agents after each significant task.**
> This file captures key decisions, gotchas, and context that shouldn't need to be re-discovered.
> Always read this before starting work. Always update this after discovering something important.

---

## 🏛️ Architecture Decisions (Finalized — Do Not Revisit)

| Decision | Context | Date |
|---|---|---|
| **Monolith over microservices** | Started as microservices, converted to a single Spring Boot app. All services are packages under `com.devopssuite.monolith`. Do NOT re-introduce microservice separation. | — |
| **No Kafka** | Replaced with Spring's internal `ApplicationEventPublisher` for async events. Removed Kafka and Zookeeper from docker-compose. Do NOT add them back. | — |
| **No API Gateway** | Removed Spring Cloud Gateway. The monolith handles all routing internally. | — |
| **Single PostgreSQL DB** | One database `devopssuite`, managed entirely by Flyway. All domains share the same schema. | — |
| **Port 8082 for backend (host)** | Backend container internal port is still 8081. Host-side was changed to 8082 in docker-compose to avoid collision with the admin-proxy nginx (which uses 8080/8083). Frontend `.env` and local dev still use `localhost:8082` (or `localhost:8081` for direct native runs). | 2026-09-09 |
| **Tailwind CSS on frontend** | Frontend uses Tailwind CSS for styling. Do not introduce other CSS frameworks. Maintain consistency with existing components. | — |
| **Option A for observability** | Admins access Kibana directly for logs; Grafana directly for metrics. No custom log-search API or custom metrics dashboard was built. All observability goes through those dedicated UIs. | 2026-09-09 |

---

## ⚠️ Known Gotchas & Issues

- **Maven build must be run from `/backend` directory.** The root directory does not have a parent `pom.xml` for the monolith.
- **Frontend `.env` contains `VITE_API_URL=http://localhost:8082` (host-mapped backend port) and `VITE_WS_URL=ws://localhost:8082/ws`.** Updated from 8081 to 8082 after docker-compose port change. Native `mvn spring-boot:run` still runs on 8081 — adjust frontend `.env` accordingly when running outside Docker.
- **Code execution sandbox requires Docker Desktop to be running** on the local machine — it creates ephemeral containers at runtime.
- **Google OAuth2 requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`** — see `oauth_setup.md` in root for the setup guide.
- **`progress.md` in root references old microservice paths** (e.g., `c:/Users/DELL/Desktop/...`) — these are stale links from an earlier project state; ignore them.
- **Flyway migration files are in** `backend/src/main/resources/db/migration/`. Always name new migrations `V{next}__description.sql` following existing numbering.
- **`ADMIN_PASSWORD` must be set in `.env` before `docker-compose up`** — the `htpasswd-init` container will exit with code 1 if it is blank, preventing the admin-proxy from starting. See `.env.example` for details.
- **Redis is not exposed on any host port** — it is internal to the `app` network only. To inspect Redis in dev, use `docker exec -it devopssuite-redis redis-cli`.
- **Elasticsearch is not exposed on any host port** — internal to `observability` network. To query ES directly in dev, use `docker exec -it devopssuite-elasticsearch curl http://localhost:9200`.
- **`RateLimitFilter` runs before `JwtRequestFilter`** — for auth endpoints (login/register), identity falls back to IP because the request is unauthenticated. The 20-req/min auth limit is therefore IP-based.

---

## ✅ Verified Working (as of last check)

- `mvn clean compile` — backend compiles successfully
- Database schemas unified into a single Flyway migration
- Auth module (registration, login, JWT filter) — fully implemented
- Project module (projects, boards, columns, tasks CRUD) — fully implemented
- Metrics Dashboard (`/api/metrics/dashboard`) — fully implemented and integrated with Actuator/Service Health checking
- Code Execution Sandbox (all languages executing securely with correct status mapping and user history) — fully verified
- Frontend API paths pointing to `http://localhost:8082/api` — confirmed (updated from 8081 post docker-compose port change)
- **Notification system** — fully implemented end-to-end (see details below)
- **Infrastructure integration** — Elasticsearch log indexing, Grafana/Kibana auto-provisioning, Redis caching + rate limiting all implemented (see below)

---

## 🔧 Partially Implemented

- **WebSocket real-time features** — Config and topics exist; end-to-end testing with live backend not yet completed

---

## 🔍 Infrastructure Integration (implemented 2026-09-09)

### Elasticsearch + Kibana

- Every HTTP request is indexed to `devopssuite-logs-yyyy.MM.dd` by `ElasticsearchLogService` (async Spring event listener on `LogEvent`).
- `kibana-init` one-shot container POSTs the `devopssuite-logs-*` data view and default saved search to Kibana on first startup via `/api/data_views/data_view`.
- Kibana is **not** directly exposed on any host port — accessed via admin-proxy at `http://localhost:8083` (Basic Auth required).
- Elasticsearch is internal-only (no host port mapping).

### Prometheus + Grafana

- Prometheus scrapes `/actuator/prometheus` every 15 s (standard Spring Boot + Micrometer auto-metrics).
- Custom metrics added under `devopssuite.*` prefix via `AppMetrics` bean:
  - `devopssuite_code_executions_total{language, status}` — incremented in `ExecutionQueueWorker`
  - `devopssuite_task_operations_total{operation}` — incremented in `TaskService` (created/updated/status_changed/deleted)
  - `devopssuite_active_users` gauge — 5-min sliding window via Redis sorted set `metrics:active_users`, refreshed every 30 s by `RequestLoggingFilter`
  - `devopssuite_cache_hits_total{cache}` and `devopssuite_cache_misses_total{cache}` — incremented in `RedisCacheService`
  - `devopssuite_rate_limit_blocked_total{endpoint}` — incremented in `RateLimitFilter`
- Two Grafana dashboards auto-provisioned via `config/grafana/provisioning/`:
  - `DevOps Suite — Application Overview` (uid: `devopssuite-overview`) — HTTP RPS, error rate, latency percentiles, top endpoints, code executions, task ops, active users, cache hit/miss, rate limit blocks
  - `DevOps Suite — JVM & System` (uid: `devopssuite-jvm`) — heap/non-heap memory, GC pause rate/duration, threads, CPU usage, HikariCP connection states/timing/timeouts, process uptime
- Grafana is **not** directly exposed on any host port — accessed via admin-proxy at `http://localhost:8080` (Basic Auth required).
- Prometheus is internal-only (no host port mapping).

### Redis

- **JWT blacklisting** (pre-existing): `blacklist:<token>` keys with TTL = token remaining lifetime.
- **Cache-aside** via `RedisCacheService` (`com.devopssuite.config`):
  - `user:<userId>` — 30 min TTL. Populated on `GET /api/users/{id}` (self-view only). Evicted on follow/unfollow.
  - `project:<projectId>` — 15 min TTL. Populated on `getProject()`. Evicted on update, delete, member add/remove/role-change.
- **Active-user tracking**: `metrics:active_users` sorted set (score = epoch millis). Written by `RequestLoggingFilter` on every authenticated request. TTL = 10 min.
- **Rate limiting** via `RateLimitFilter` (registered before `JwtRequestFilter`):
  - `rate:<tier>:<identity>:<bucket>` keys with TTL = window + 5 s.
  - Tiers: `execution` (10/min), `auth` (20/min), `api` (300/min).
  - Returns HTTP 429 with `Retry-After` header + JSON error body on breach.
  - Limits overridable via `RATE_LIMIT_EXECUTION_MAX`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_API_MAX` env vars.

### Network isolation

Two Docker bridge networks:
- `app` — frontend, backend, postgres, redis
- `observability` — backend, elasticsearch, kibana, prometheus, grafana, admin-proxy

Postgres, Redis, Elasticsearch, Prometheus, Grafana, Kibana are **not** bound to host ports — all use `expose:` only.
Backend is the bridge between both networks (needs ES for log indexing, needs Prometheus scraping via `host.docker.internal`).

### Admin access URLs (after `docker-compose up`)

| UI | URL | Auth |
|---|---|---|
| Grafana | http://localhost:8080 | nginx Basic Auth (`ADMIN_USER`/`ADMIN_PASSWORD`) then Grafana login (`admin`/`GRAFANA_PASSWORD`) |
| Kibana | http://localhost:8083 | nginx Basic Auth (`ADMIN_USER`/`ADMIN_PASSWORD`) |
| Backend API | http://localhost:8082 | JWT |
| Frontend | http://localhost:80 | — |

---

## 📋 Key Environment Variables

| Variable | Used By | Description |
|---|---|---|
| `JWT_SECRET` | Backend | HMAC secret for signing JWTs |
| `JWT_EXPIRATION_MS` | Backend | Access token TTL (default: 3600000 = 1h) |
| `REFRESH_TOKEN_EXPIRATION_MS` | Backend | Refresh token TTL (default: 604800000 = 7d) |
| `DB_URL` | Backend | PostgreSQL JDBC URL |
| `DB_USERNAME` / `DB_PASSWORD` | Backend | Database credentials |
| `REDIS_HOST` / `REDIS_PORT` | Backend | Redis connection |
| `GOOGLE_CLIENT_ID` | Backend | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Backend | Google OAuth2 client secret |
| `VITE_API_URL` | Frontend | Backend REST base URL |
| `VITE_WS_URL` | Frontend | WebSocket endpoint URL |

---

## 📝 Agent Notes Log

> _Append new entries below with a short description and context._

| Date | Agent | Note |
|---|---|---|
| 2026-08-07 | Antigravity | Initial MEMORY.md created from project codebase analysis. Auth + Project modules confirmed working. Code execution sandbox partially done. |
| 2026-08-28 | Antigravity | Completed Code Execution Sandbox implementation. Fixed temp paths, DinD bind-mounts, read-only FS, status mapping (QUEUED/RUNNING/COMPLETED/TIMEOUT/OOM_KILLED), history API, and updated frontend polling. Added unit tests for service validation. |
| 2026-08-29 | Antigravity | Resolved C++ execution failure: built local `devopssuite-cpp:latest` runtime, added Flyway `V5` migration, and enabled `rw,exec,nosuid,size=64m` on `/tmp` tmpfs mount so compiled binaries execute in read-only containers. All 4 languages (Python, JS, Java, C++) now verified working. |
| 2026-08-30 | Antigravity | Fixed login redirect bug on page reload: implemented missing `AuthService.getCurrentUser()` to call `authApi.getCurrentUser()`, preventing unhandled exceptions in `AuthContext` initialization from triggering logout. Documented in `docs/Debugging/03_page_reload_login_redirect.md`. |
| 2026-08-30 | Antigravity | Fixed Add Member functionality in Project module: enabled backend user resolution via `email` (as well as `userId`), added 404 response on un-registered users, and implemented frontend mailto invitation modal flow for inviting unregistered teammates. Added unit tests for email resolution. |
| 2026-09-08 | Kiro | Full notification system implemented (Options A–G). See notification section in MEMORY.md for details. |
| 2026-09-09 | Kiro | Full infrastructure integration implemented. Elasticsearch log indexing connected; Kibana auto-provisioned with data view; Grafana auto-provisioned with 2 dashboards (Application Overview + JVM/System); custom Micrometer metrics added (AppMetrics bean); Redis cache-aside for User/Project; Redis rate limiting (RateLimitFilter, 3 tiers); nginx admin-proxy with HTTP Basic Auth in front of Grafana+Kibana; network isolation (app + observability networks); all infra services unexposed from host except backend (8082), frontend (80), Grafana-via-proxy (8080), Kibana-via-proxy (8083). |

---

## 🔔 Notification System (implemented 2026-09-08)

### Architecture

```
Service Layer (TaskService / ProjectService / ExecutionQueueWorker)
    │  publishEvent(...)
    ▼
ApplicationEventPublisher  (in-JVM Spring Events)
    │  @Async @EventListener
    ▼
NotificationEventListener
    ├── notificationService.createNotification()  → PostgreSQL + WebSocket push
    │   └── checks NotificationPreferenceService.getEffective() — in-app opt-out respected
    └── emailNotificationService.send*Email()     → SMTP (optional, no-op if unconfigured)
        └── checks notificationService.isEmailEnabled() — email opt-in respected
```

### Event types and triggers

| Type | Trigger location | Event record |
|---|---|---|
| `TASK_ASSIGNED` | `TaskService.createTask()` — when assigneeId is set | `TaskAssignedEvent` |
| `TASK_REASSIGNED` | `TaskService.updateTask()` — when assigneeId changes | `TaskReassignedEvent` |
| `TASK_COMPLETED` | `TaskService.updateStatus()` + `reorderTasks()` — when status→DONE | `TaskCompletedEvent` |
| `PROJECT_JOINED` | `ProjectService` — on member add | `MemberAddedEvent` |
| `ROLE_CHANGED` | `ProjectService` — on role update | `MemberRoleChangedEvent` |
| `PROJECT_REMOVED` | `ProjectService` — on member remove | `MemberRemovedEvent` |
| `EXECUTION_FAILED` | `ExecutionQueueWorker` — on FAILED/TIMEOUT/OOM_KILLED | `ExecutionFailedEvent` |

### WebSocket

- STOMP endpoint: `ws://localhost:8081/ws` (SockJS)
- Per-user topic: `/topic/notifications/{userId}` (UUID string)
- Kanban live topic: `/topic/tasks/{projectId}`
- JWT validated on STOMP CONNECT via `StompAuthChannelInterceptor` (checks signature + Redis blacklist)

### REST API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notifications` | Paginated inbox (Spring `Page`) |
| `GET` | `/api/notifications/unread-count` | Returns `{ count: N }` |
| `PUT` | `/api/notifications/{id}/read` | Mark one read |
| `PUT` | `/api/notifications/read-all` | Mark all read |
| `DELETE` | `/api/notifications/{id}` | Delete one |
| `GET` | `/api/notifications/preferences` | All preferences for current user (defaults included) |
| `PUT` | `/api/notifications/preferences/{type}` | Upsert one preference |

### Frontend

- `NotificationContext` — subscribes to `/topic/notifications/${user.userId}`, seeds list via `getAll()` on mount, exposes `{ notifications, unreadCount, hasMore, markAsRead, markAllAsRead, deleteNotification, loadMore, refresh }`
- `NotificationsPage` — full inbox with All/Unread tabs, load-more pagination, per-item mark-as-read + delete
- `NotificationItem` — shared component (compact mode for header dropdown, full mode for page)
- `Header.jsx` — bell + badge + dropdown using compact `NotificationItem`, "See all" link to `/notifications`
- `ProfilePage` — Notification Preferences card with per-type in-app/email toggles

### Known gotchas

- `NotificationPreferenceService.getEffective()` returns an **unsaved** entity with defaults when no row exists — do not call `notificationRepository.save()` on it or it will create a row. It is read-only.
- Email is **opt-in** by default (`email=false`). Users must explicitly enable it in Preferences. In-app is **opt-out** (`inApp=true` by default).
- `EmailNotificationService` is injected with `@Autowired(required=false)` — if `spring.mail.host` is blank, `JavaMailSender` is not configured and all email sends are silently skipped.
- The `notification/consumer/` and `notification/config/` directories remain empty — they were Kafka-era placeholders. Do not delete them (they are ignored by the compiler).
- `TaskUpdateDto` is a nested static class inside `ProjectDto.java` — import it as `com.devopssuite.project.dto.ProjectDto.TaskUpdateDto`.
- Frontend `notificationApi.getAll()` returns the raw Spring `Page` object (`{ content, totalElements, last, ... }`). Access items via `.content`, not `.data.content`.
- **`user.userId` was missing from `normalizeUser()` in `authApi.js`** — `AuthDto.UserResponse` serializes the UUID as `user_id` (snake_case via `@JsonProperty("user_id")`), but `normalizeUser` did not map it to camelCase `userId`. As a result `NotificationContext`'s WebSocket subscription guard `user?.userId` was always `undefined`, so the `/topic/notifications/{userId}` subscription was never registered and **no real-time notifications (including role-change) were delivered**. Fixed 2026-09-08 by adding `userId: user.userId ?? user.user_id ?? null` to `normalizeUser`. If you ever add new snake_case fields to `UserResponse`, add matching normalization here too.
