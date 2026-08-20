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
- [ ] **WebSocket STOMP Broker** ? Implement `WebSocketConfig.java` on port `8081` at `/ws` using SockJS so frontend can connect.
- [ ] **Real-time logs streaming** ? Feed application console logs straight to the websocket topic `/topic/logs/{projectId}`.
- [ ] **Kanban Board WebSocket updates** ? Broadcast card movements and re-order operations on `/topic/tasks/{projectId}`.
- [ ] **In-App Notifications** ? Implement `notification` module using Spring Application Events to notify user sessions asynchronously on `/topic/notifications/{userId}`.
- [ ] **Structured logging pipeline** ? Consolidate console logs in JSON format and configure Elasticsearch indexing.
- [ ] **Metrics Dashboard charts** ? Map Actuator `/actuator/metrics` to frontend Recharts diagrams.

---

## ?? Stretch Goals

- [ ] **Google OAuth2 Login** ? Complete the Spring Security success handler redirecting to React callback.
- [ ] **Reset Password flow** ? Implement `forgot-password` and `reset-password` endpoints utilizing time-limited email tokens. (Requires configuring Spring Mail + email provider details).
- [ ] **CI/CD Pipelines** ? Add GitHub Actions workflow for monolithic compile, unit test passes (JaCoCo), and Docker builds.
- [ ] **Kubernetes deployment** ? Configure Helm chart files.
- [ ] **End-to-End Tests** ? Implement Cypress tests inside the scaffolded `cypress/` directory.

