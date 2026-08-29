# TASKS.md — Current Work & Backlog

> **Living task board for AI agents.**
> Check this before starting any work to avoid duplicating effort.
> Update this after completing or starting a task.

---

## 🟢 Project Status: COMPLETED (as of 2026-08-22)
> All development is complete. The project is in the **manual testing & bug fixing** phase only.
> Do NOT start new feature work unless explicitly instructed.

---

## 🔴 In Progress

- **Manual Testing & Bug Fixing** — All features are implemented. Only manual QA and bug fixes are active.

---

## 🟡 Backlog — High Priority

### Backend

- [ ] **Replace hardcoded admin seed credentials**
  - `DataSeeder.java` (`com.devopssuite.config`) currently creates a default admin user with
    `email=admin` / `password=admin` on every startup if the account does not exist.
  - This is **DEV-ONLY**. Before any production deployment, replace with one of:
    - Environment-variable-driven credentials (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`)
    - A one-time setup endpoint that is disabled after first use
    - An external identity provider / LDAP / SSO
  - File to update: `backend/src/main/java/com/devopssuite/config/DataSeeder.java`

- [x] **Complete Code Execution Sandbox**
  - All phases implemented: Docker path fix, DinD bind-mount, API alignment, terminal statuses, history endpoint, frontend, unit tests
  - Files: `execution/` package under `com.devopssuite.execution`
  - **Detailed plan:** [`.agents/tasks/complete-code-execution-sandbox.md`](tasks/complete-code-execution-sandbox.md)
  - Ref: `docs/05-lld-detailed-design.md` §5

- [ ] **Wire Elasticsearch logging pipeline**
  - Structured log emission works; Elasticsearch write pipeline not connected
  - Need to implement log indexing in the `logging` module
  - Ref: `docs/09-monitoring-observability.md`

- [ ] **WebSocket end-to-end testing**
  - Config and topics exist; need live integration testing with frontend
  - Topics: `/topic/notifications/{userId}`, `/topic/logs/{projectId}`, `/topic/tasks/{projectId}`

- [ ] **CI/CD Pipeline — GitHub Actions**
  - No `.github/workflows/` files exist
  - Need: build, test, Docker image build + push workflows
  - Ref: `docs/07-deployment-devops.md`

- [x] **Dockerfile for backend** — Multi-stage build (`maven:3.9-eclipse-temurin-21` → `eclipse-temurin:21-jre-alpine`); backend now compiles and runs inside Docker via `docker-compose up -d --build backend`

### Frontend

- [ ] **Full integration test with live backend**
  - Frontend pages are scaffolded; need to verify all API calls work against the running backend
  - Focus: Auth flow, Kanban CRUD, Code Editor submit/result, WebSocket log streaming

- [x] **Metrics Dashboard charts**
  - Connected dashboard, metrics, and health charts/cards to real aggregated Actuator and repository counts via `/api/metrics/dashboard`

---

## 🟢 Completed

- [x] **Monolith backend scaffold** — Single Spring Boot app under `com.devopssuite.monolith` compiles successfully
- [x] **Auth module** — Registration, login, refresh tokens, secure logout (Redis-backed blacklist), validation annotations, complex password rules, and custom exception handler fully implemented.
- [x] **Project module** — Projects, boards, columns, tasks entities + Flyway migrations + CRUD controllers done
- [x] **Flyway migration** — Single unified migration file for all domain schemas
- [x] **Docker Compose infrastructure** — PostgreSQL, Redis, Elasticsearch, Kibana, Prometheus, Grafana all configured
- [x] **Frontend routing & layout** — React Router, ProtectedRoute/PublicRoute, Header, Sidebar, MainLayout done
- [x] **Frontend state/context** — AuthContext, NotificationContext, WebSocketContext implemented
- [x] **Frontend API clients** — Axios clients for auth, projects, tasks, execution, logs, metrics
- [x] **Frontend pages scaffold** — Login, Register, Projects, Kanban, Code Editor, Logs, Metrics pages exist
- [x] **Architecture conversion** — Converted from microservices to monolith; removed Kafka, Zookeeper, API Gateway
- [x] **Agent context files** — AGENTS.md, GEMINI.md, .agents/ directory created

---

- [ ] Kubernetes manifests (Helm chart)
- [ ] Multi-stage Docker build for production frontend (Nginx)
- [x] **Add more code execution languages (Java, C++)** — Added and verified full sandboxed execution support for Java 21 and C++ (g++ 15) alongside Python and JavaScript.
- [ ] End-to-end Cypress tests (`cypress/` directory exists, tests not yet written)
- [ ] Health page with status of all infrastructure components
- [ ] Notification email delivery (currently only in-app via WebSocket)
- [ ] **Migrate PostgreSQL to Neon** — Replace the self-hosted `postgres:16-alpine` Docker container with a [Neon](https://neon.tech) serverless PostgreSQL instance. Steps: provision a Neon project, update `SPRING_DATASOURCE_URL` in `docker-compose.yml` with the Neon connection string, add credentials to `.env`, and remove the `postgres` service + `postgres_data` volume from Compose.
- [ ] **Reset Password flow** — `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` with time-limited token via email link. Requires an email service to be wired first (e.g. Mailtrap for dev, SendGrid for prod). Add `spring-boot-starter-mail` to `pom.xml` and configure SMTP credentials in `.env` before implementing.


---

## 📌 Task Notes

> _Append notes about blocked tasks or important context for ongoing work._

| Task | Note |
|---|---|
| Code Execution Sandbox | Docker Desktop must be running on the host. Test with simple Python `print("hello")` first. |
| Elasticsearch pipeline | Kibana index pattern `devopssuite-logs-*` should be the target. |
| GitHub Actions | Use Java 21 + Maven in CI. Cache `.m2` directory for faster builds. |
