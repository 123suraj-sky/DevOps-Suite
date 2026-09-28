# TASKS.md — Current Work & Backlog

> **Living task board for AI agents.**
> Check this before starting any work to avoid duplicating effort.
> Update this after completing or starting a task.

---

## 🟢 Project Status: COMPLETED (as of 2026-09-24)

> All development is complete. The project is fully implemented and functional.
> Do NOT start new feature work unless explicitly instructed.
> Only maintenance, hardening, and optional enhancements remain.

---

## 🔴 In Progress

*None.* All features are implemented.

---

## 🟡 Backlog — Remaining Improvements

### Backend

- [ ] **Replace hardcoded admin seed credentials**
  - `DataSeeder.java` (`com.devopssuite.config`) creates a default admin user with
    `email=admin` / `password=admin` on startup if the account does not exist.
  - This is **DEV-ONLY**. Before any production deployment, replace with:
    - Environment-variable-driven credentials (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`)
    - Or a one-time setup endpoint disabled after first use
  - File to update: `backend/src/main/java/com/devopssuite/config/DataSeeder.java`

- [ ] **Migrate PostgreSQL to Neon** *(optional enhancement)*
  - Replace the self-hosted `postgres:16-alpine` Docker container with a [Neon](https://neon.tech) serverless PostgreSQL instance.
  - Steps: provision Neon project, update `SPRING_DATASOURCE_URL` in `docker-compose.yml`, add credentials to `.env`, remove the `postgres` service + `postgres_data` volume from Compose.

- [ ] **Full integration test with live backend**
  - Verify all API calls work against the running backend end-to-end.
  - Focus areas: Auth flow (including Google + GitHub OAuth2), Kanban CRUD, IDE file persistence, Code Execution submit/result/history, WebSocket log streaming, Notification delivery, Admin user management.

### Frontend

- [ ] **End-to-end Cypress tests**
  - `cypress/` directory exists in the repo; tests have not been written yet.
  - Priority flows: login, register, create project, create task, run code, view notifications.

### CI/CD

- [ ] **Complete CI/CD pipeline** *(partially done)*
  - `.github/workflows/deploy.yml` exists but may need completion / verification.
  - Need: build, test, Docker image build + push workflows fully verified.
  - Ref: `docs/07-deployment-devops.md`

---

## 🟢 Completed

- [x] **Monolith backend scaffold** — Single Spring Boot app under `com.devopssuite` compiles successfully
- [x] **Auth module** — Registration, login, logout (Redis blacklist), refresh tokens, validation, complex password rules, global exception handler
- [x] **Google OAuth2** — Spring OAuth2 Resource Server integration; `/api/auth/oauth2/callback/google`
- [x] **GitHub OAuth2** — GitHub authorization code exchange; frontend `GitHubCallbackPage` at `/auth/github/callback`
- [x] **Password reset flow** — `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` with time-limited token via email link; frontend pages `/forgot-password` and `/reset-password`
- [x] **Project module** — Projects, boards, columns, tasks entities + Flyway migrations + full CRUD controllers
- [x] **Kanban board** — Column/task management, status transitions, task reordering; WebSocket real-time updates via `/topic/tasks/{projectId}`; task movement via context menu / edit modal
- [x] **Code Execution Sandbox** — Ephemeral Docker containers; async queue worker; Python 3.12, Node 24, Java 21, C++ (g++ 15); stdin piping; compilation; resource constraints (1 CPU, 256MB RAM, no-network, 30s timeout); execution history endpoint
- [x] **Full IDE** — `IDEPage` at `/projects/:id/code` with FileExplorer, EditorTabs, IDEEditor (Monaco), IDEOutputPanel, PreviewPanel; file persistence via `ideFilesApi` (`/api/ide/files`); `FullScreenIDEPage` at `/editor` (standalone no-sidebar)
- [x] **Flyway migrations** — 16 migrations (V1–V16) covering all domain schemas
- [x] **Docker Compose infrastructure** — PostgreSQL, Redis, Elasticsearch, Kibana, Prometheus, Grafana; network isolation (app + observability networks); all infra ports unexposed from host
- [x] **Nginx admin proxy** — Grafana proxied at `:8080`, Kibana proxied at `:8083`; both protected by HTTP Basic Auth via nginx
- [x] **Multi-stage Docker builds** — Frontend: multi-stage Vite build → nginx image (port 80); Backend: `maven:3.9-eclipse-temurin-21` → `eclipse-temurin:21-jre-alpine`
- [x] **Docker Compose frontend service** — `frontend` nginx service at port 80; two ways to run frontend: Docker (`http://localhost:80`) or local npm dev (`http://localhost:5173`)
- [x] **Elasticsearch logging pipeline** — `ElasticsearchLogService` indexes every HTTP request to `devopssuite-logs-yyyy.MM.dd`; enriched fields: severity, `traceId` (MDC), `clientIp`, `userAgent`, exception details, code execution metadata, domain audit events
- [x] **ILM retention policy** — Elasticsearch auto-deletes indices older than 180 days; policy `devopssuite_logs_retention_policy` + index template `devopssuite_logs_template` provisioned at startup
- [x] **Kibana auto-provisioning** — `kibana-init` container provisions data view (`devopssuite-logs-*`), saved searches, and 3 dashboards: Observability, Security, Analytics
- [x] **WebSocket real-time** — 3 topics fully wired: `/topic/notifications/{userId}`, `/topic/tasks/{projectId}`, `/topic/logs/{projectId}`
- [x] **STOMP JWT auth** — `StompAuthChannelInterceptor` validates JWT signature + Redis blacklist on STOMP CONNECT
- [x] **Rate limiting** — Redis sliding-window rate limiting for Auth, Execution, and general API; configurable via `RATE_LIMIT_EXECUTION_MAX`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_API_MAX` env vars
- [x] **Notification system (full)** — In-app WebSocket toasts, email HTML templates, 6 notification types (TaskAssigned, TaskCompleted, TaskReassigned, ExecutionFailed, ProjectInvited, MentionedInComment), per-user notification preferences (in-app × email per type), NotificationsPage with tabs + pagination
- [x] **Notification preferences** — `V14` Flyway migration; full entity/repository/service/controller; profile page preference toggle grid
- [x] **User profile** — Avatar customization (presets + custom URL + crop modal), user stats, activity heatmap, follow/unfollow, profile view count, notification preferences
- [x] **Admin panel** — `/admin/users` page (AdminUsersPage); manage users and roles; guarded by `AdminRoute`; backed by `adminApi.js`
- [x] **Dark / Light theme** — `ThemeContext` + `ThemeProvider` (outermost provider); persisted to localStorage; Tailwind `dark` class strategy
- [x] **Frontend routing & layout** — React Router, ProtectedRoute/PublicRoute/AdminRoute, Header, Sidebar, MainLayout; all 17 routes implemented
- [x] **Frontend contexts** — AuthContext, WebSocketContext, NotificationContext, EditorContext, ProjectsContext, ThemeContext
- [x] **Frontend API clients** — 13 files: authApi, adminApi, client, codeExecutionApi, ideFilesApi, index, logApi, metricsApi, notificationApi, notificationPreferenceApi, projectApi, taskApi, userApi
- [x] **Metrics in Dashboard** — Admin dashboard embeds Recharts metrics charts (throughput, latency, error rate) + service health panel; no standalone `/metrics` page
- [x] **GitHub Actions CI/CD** — `.github/workflows/deploy.yml` created
- [x] **Prometheus + Grafana** — Spring Actuator / Micrometer endpoints; Grafana dashboards configured
- [x] **Architecture conversion** — Converted from microservices to monolith; removed Kafka, Zookeeper, API Gateway
- [x] **Agent context files** — AGENTS.md, GEMINI.md, .agents/ directory, MEMORY.md, ARCHITECTURE.md, TASKS.md, coding-conventions.md

---

## 📌 Task Notes

| Task | Note |
|---|---|
| Admin seed credentials | Default: `email=admin` / `password=admin`. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` before production. |
| Code Execution Sandbox | Docker Desktop must be running on the host. Test with simple Python `print("hello")` first. |
| Elasticsearch pipeline | Kibana index pattern `devopssuite-logs-*` is auto-provisioned by `kibana-init` container on startup. |
| GitHub Actions | Use Java 21 + Maven in CI. Cache `.m2` directory for faster builds. |
| Notification email | Set `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` in `.env`. Use Mailtrap for dev. Email is opt-in per user — enable in Profile → Notification Preferences. |
| Notification preferences | `NotificationPreferenceService.getEffective()` returns an unsaved default entity — never call `.save()` on it directly. |
| Admin observability access | Set `ADMIN_PASSWORD` in `.env` before `docker-compose up`. Grafana at http://localhost:8080, Kibana at http://localhost:8083. Both require nginx Basic Auth. |
| Rate limiting | Defaults: 10/20/300 per 60s window for Execution/Auth/API. Configurable via env vars. |
| Backend port | Internal port 8081, host-exposed at **8082** via docker-compose port mapping. Set `VITE_API_URL=http://localhost:8082` in frontend `.env` when running with Docker Compose. |
| Frontend port | Docker nginx service runs at port **80**. Local dev server runs at **5173**. |
