# DevOps Suite - Implementation Plan (Monolith)

## Architecture
A monolithic Spring Boot application running on port `8081` alongside a React frontend, backed by PostgreSQL and Redis, and monitored via Prometheus/Grafana and Elasticsearch/Kibana.

---

## Phase 1: Core Foundation & Auth
- **Backend Setup:** Consolidated single-module Spring Boot application.
- **Security:** Spring Security filter chain with JWT validations, registration and login REST routes, and Google OAuth2 configuration.
- **Projects:** Flyway migrations, database models (Project, Board, Column, Task), and CRUD APIs.
- **Deliverable:** Authentication and Project Kanban boards working end-to-end on port `8081`.

---

## Phase 2: Code Execution sandbox
- **Sandbox Engine:** Docker client integration running code snippets in sandboxed containers (CPU/memory caps, no-network, read-only FS).
- **Languages:** Python and JavaScript support.
- **Deliverable:** Secure code execution.

---

## Phase 3: Observability & Real-Time
- **Real-Time Updates:** WebSocket STOMP endpoint (`/ws`) for log streams and Kanban board updates.
- **Internal notifications:** Publish Spring application events (`UserRegisteredEvent`, `TaskUpdateEvent`) consumed asynchronously for email or Toast alerts.
- **Metrics/Logs:** Actuator / Prometheus scraping, structured logs ingestion to ELK Stack.

---

## Phase 4: Frontend Integration
- **React SPA:** Integrated with the monolithic APIs at `http://localhost:8081/api` and WebSockets at `ws://localhost:8081/ws`.
- Monaco-based editor, drag-and-drop Kanban Board, log viewer, and metrics graphs.
