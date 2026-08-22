# Project Roadmap - DevOps Suite

## 🟢 Project Status: **COMPLETED** (as of 2026-08-22)
> All 4 development phases are complete. The project is currently in the **manual testing & bug fixing** phase only. No new features are being added.

---

## 1. Overview
The development plan is organized into 4 consolidated phases over a 16-week timeline, focusing on building a monolithic Spring Boot backend and React frontend.

---

## 2. Development Phases

### Phase 1: Core Foundation & Auth (Weeks 1-4)
- **Monolith Setup:** Create single-module Spring Boot project.
- **Authentication:** Establish security filter chain, JWT access/refresh token generation, and Google OAuth.
- **Project Domain:** Create PostgreSQL schema migrations via Flyway, write Project/Board/Task/Member REST API controller mappings.
- **Database:** Connect connection pool (HikariCP) and set up local Redis caching.

### Phase 2: Code Execution Sandbox (Weeks 5-8)
- **Execution Sandbox:** Integrate Docker client (`docker-java`) for running Python/JavaScript code snippets.
- **Container Hardening:** Limit CPU/memory, configure read-only filesystem, disable network, and enforce time execution limits.
- **Async Execution:** Handle code runs queue and results persistence.

### Phase 3: Observability & Real-Time (Weeks 9-12)
- **Logs & Metrics:** Configure Actuator/Prometheus metrics endpoints, format structured JSON logs, and mount logs to Elasticsearch.
- **Real-Time Updates:** Configure direct WebSocket (STOMP/SockJS) channels for log tails and task update indicators.
- **Internal Notifications:** Wire Spring Application Events to notify listeners asynchronously on critical actions.

### Phase 4: React Frontend & Polish (Weeks 13-16)
- **React Pages:** Build Monaco-based editor, drag-and-drop Kanban Board, live log viewer, and metrics charts.
- **Polish:** Configure endpoint rate limiters and conduct load testing.

---

## 3. Deliverables

| Phase | Key Deliverables |
|---|---|
| Phase 1 | Clean monolithic codebase, user auth flow, project management CRUD APIs |
| Phase 2 | Secure docker-based execution sandbox running Python and Javascript |
| Phase 3 | Live metrics (Prometheus/Grafana), indexed search logs (ELK), WebSocket streams |
| Phase 4 | Full React SPA integration, load and security testing |
