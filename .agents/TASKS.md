# TASKS.md — Current Work & Backlog

> **Living task board for AI agents.**
> Check this before starting any work to avoid duplicating effort.
> Update this after completing or starting a task.

---

## 🔴 In Progress

_Nothing currently in active progress._

---

## 🟡 Backlog — High Priority

### Backend

- [ ] **Complete Code Execution Sandbox**
  - Core classes exist; Docker runner integration needs completion
  - Files: `execution/` package under `com.devopssuite.monolith`
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

- [ ] **Metrics Dashboard charts**
  - Connect Recharts components to real `/actuator/metrics` API responses

---

## 🟢 Completed

- [x] **Monolith backend scaffold** — Single Spring Boot app under `com.devopssuite.monolith` compiles successfully
- [x] **Auth module** — Registration, login, JWT filter, Google OAuth2 config fully implemented
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

## 🔵 Stretch Goals (Post-MVP)

- [ ] Kubernetes manifests (Helm chart)
- [ ] Multi-stage Docker build for production frontend (Nginx)
- [ ] Add more code execution languages (Go, Rust, C++)
- [ ] End-to-end Cypress tests (`cypress/` directory exists, tests not yet written)
- [ ] Health page with status of all infrastructure components
- [ ] Notification email delivery (currently only in-app via WebSocket)

---

## 📌 Task Notes

> _Append notes about blocked tasks or important context for ongoing work._

| Task | Note |
|---|---|
| Code Execution Sandbox | Docker Desktop must be running on the host. Test with simple Python `print("hello")` first. |
| Elasticsearch pipeline | Kibana index pattern `devopssuite-logs-*` should be the target. |
| GitHub Actions | Use Java 21 + Maven in CI. Cache `.m2` directory for faster builds. |
