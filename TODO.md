# DevOps Suite ? Project TODOs

This file tracks outstanding developer and agent tasks for the DevOps Suite monolithic platform.

---

## ?? High Priority

### Code Execution Sandbox (Phase 2 completion)
- [x] **Pipe stdin** — Wire `stdin` payload from requests to the ephemeral container inside `DockerSandbox.java`. (Completed)
- [x] **Java compilation support** — Extend sandbox language capabilities to build and run Java classes. (Completed)
- [x] **C++ compilation support** — Extend sandbox language capabilities to build and run C++ files. (Completed)
- [x] **Docker-in-Docker path alignment** — Fix hardcoded local directory paths (`backend/code-execution-service/temp/`) so directory mounting is portable inside dockerized environments via host-temp-dir property. (Completed)
- [x] **Align API routes** — Sync endpoint mappings (frontend calls `/api/execution/run` but backend currently exposes `/api/v1/execute`). (Completed)

---

## ?? Medium Priority

### Observability & Real-Time (Phase 3)
- [x] **WebSocket STOMP Broker** — `WebSocketConfig.java` at `/ws`, SockJS, `/topic` broker. (Completed)
- [x] **Real-time logs streaming** — `RequestLoggingFilter` + `LogStreamingService` broadcast project-scoped logs to `/topic/logs/{projectId}`. (Completed)
- [x] **In-App Notifications** — Full `notification` module: DB persistence, REST API, Spring Events, WebSocket push to `/topic/notifications/{userId}`. (Completed)
- [x] **Structured logging pipeline** — `ElasticsearchLogService` indexes JSON log docs to `devopssuite-logs-{date}` index. (Completed)
- [ ] **Kanban Board WebSocket updates** — Broadcast card movements on `/topic/tasks/{projectId}` (wire into `TaskService.reorderTasks`).
- [ ] **Metrics Dashboard charts** — Map Actuator `/actuator/metrics` to frontend Recharts diagrams.

---

## ?? Stretch Goals

- [ ] **Google OAuth2 Login** ? Complete the Spring Security success handler redirecting to React callback.
- [ ] **Reset Password flow** ? Implement `forgot-password` and `reset-password` endpoints utilizing time-limited email tokens. (Requires configuring Spring Mail + email provider details).
- [ ] **CI/CD Pipelines** ? Add GitHub Actions workflow for monolithic compile, unit test passes (JaCoCo), and Docker builds.
- [ ] **Kubernetes deployment** ? Configure Helm chart files.
- [ ] **End-to-End Tests** ? Implement Cypress tests inside the scaffolded `cypress/` directory.

