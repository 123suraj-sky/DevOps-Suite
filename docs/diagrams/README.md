# DevOps Suite — Diagram Directory

This directory contains **42 interactive HTML/SVG diagrams** documenting the architecture, workflows, security model, data design, observability stack, and operational characteristics of the DevOps Suite platform.

Open [`index.html`](index.html) in a browser for a navigable gallery of all diagrams.

---

## Core Architecture & Infrastructure

| File | What it shows |
|:---|:---|
| [`system-architecture.html`](system-architecture.html) | The full system topology — React SPA, Spring Boot monolith, Docker sandbox engine, PostgreSQL, Redis, Elasticsearch, Prometheus, Grafana, and the nginx admin proxy — and how every component connects. The primary high-level overview of the platform. |
| [`docker-compose-deployment.html`](docker-compose-deployment.html) | The exact Docker Compose deployment layout: all containers, host-to-container port mappings (`:8082→8081`, `:80`, `:8080`, `:8083`, `:9090`), named volumes for persistence, and the two bridge networks (`app` and `observability`). |
| [`infrastructure-current-state.html`](infrastructure-current-state.html) | The local Docker Compose environment in its current running state — container names, environment variable bindings, filesystem volume mounts, and inter-container dependencies. |
| [`service-dependency-graph.html`](service-dependency-graph.html) | Inter-service dependency graph showing which backend modules depend on which databases, caches, and external APIs — useful for understanding blast radius if a service goes down. |
| [`third-party-integrations-map.html`](third-party-integrations-map.html) | All external integration boundaries: Google OAuth2, GitHub OAuth2, Docker Engine API (via Unix socket), SMTP mail servers, and the Prometheus scrape endpoint. |

---

## Security & Access Control

| File | What it shows |
|:---|:---|
| [`auth-oauth2-jwt-sequence.html`](auth-oauth2-jwt-sequence.html) | Full sequence diagram for all three authentication paths — local login, Google OAuth2, and GitHub OAuth2 — including JWT issuance (1h access / 7d refresh tokens), Redis token blacklist validation on every request, and the STOMP WebSocket authentication interceptor. |
| [`rbac-security-matrix.html`](rbac-security-matrix.html) | The complete Role-Based Access Control permission matrix: every role (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) mapped against every system operation and endpoint — what each role can and cannot do. |
| [`security-cross-cutting-concerns.html`](security-cross-cutting-concerns.html) | Venn diagram of the four overlapping security layers: stateless JWT auth, Redis token blacklisting, RBAC authorization checks, and Docker kernel-level sandbox isolation. |
| [`rate-limiting-decision-tree.html`](rate-limiting-decision-tree.html) | Flowchart of the Redis sliding-window rate limiting algorithm — how the key is constructed, how the counter is evaluated, when requests are allowed vs. rejected with `429 Too Many Requests`. |
| [`team-rbac-hierarchy.html`](team-rbac-hierarchy.html) | Org chart of project team role hierarchy — how `OWNER` delegates `ADMIN`, how `ADMIN` manages `MEMBER` and `VIEWER` roles within a project, and how the global admin role sits above all. |

---

## Code Execution & Sandbox

| File | What it shows |
|:---|:---|
| [`code-execution-lifecycle.html`](code-execution-lifecycle.html) | Step-by-step process diagram of the Docker sandbox runner: IDE code submission → async queue → Docker Java API → isolated ephemeral container (no network, 256MB RAM cap, 30s timeout) → stdout/stderr extraction → container cleanup. |
| [`sandbox-failure-cause-analysis.html`](sandbox-failure-cause-analysis.html) | Fishbone (Ishikawa) root cause analysis of all sandbox execution failure modes: OOM kill, container timeout, Docker socket failure, attempted network access, and filesystem permission errors. |
| [`execution-memory-vs-duration.html`](execution-memory-vs-duration.html) | Scatter chart plotting code execution job duration (seconds) against peak memory consumption (MB) — shows the performance envelope of the sandbox across different languages and programs. |
| [`code-execution-language-stats.html`](code-execution-language-stats.html) | Bar chart benchmarking execution performance and resource usage by runtime: Java 21, Python 3.12, Node.js 24, and C++ (g++ 15). |

---

## Database & Data Design

| File | What it shows |
|:---|:---|
| [`db-schema-flyway.html`](db-schema-flyway.html) | Complete database schema layout for all 16 Flyway migrations (V1–V16): every table, column, data type, primary key, foreign key relationship, and index across `users`, `projects`, `boards`, `columns`, `tasks`, `task_audit_history`, `ide_files`, `notifications`, `user_follows`, and more. |
| [`entity-relationships.html`](entity-relationships.html) | Pure entity-relationship diagram highlighting foreign key constraints, cascade rules, composite keys, and indexing strategies across the full PostgreSQL schema. |
| [`project-domain-aggregates.html`](project-domain-aggregates.html) | Domain-Driven Design aggregate boundaries: the Project Aggregate (Board → Column → Task), the User Aggregate (Profile, Follows, Preferences), and the Execution Aggregate (Run, Result, Activity). |
| [`backend-domain-classes.html`](backend-domain-classes.html) | UML class diagram of the core backend domain classes under `com.devopssuite` — entities, repositories, services, event publishers, and Spring Security interceptors with their relationships. |
| [`backend-codebase-composition.html`](backend-codebase-composition.html) | Treemap showing the proportional composition of the Java codebase by package — `auth`, `execution`, `project`, `security`, `logging`, `notification`, `metrics` — giving a sense of where most of the code lives. |

---

## Kanban & Project Management

| File | What it shows |
|:---|:---|
| [`kanban-task-state-machine.html`](kanban-task-state-machine.html) | State machine diagram for Kanban task status transitions: `Backlog → To Do → In Progress → Review → Done` — including validation guards, who can trigger each transition, and the WebSocket events fired on each change. |
| [`kanban-board-workflow.html`](kanban-board-workflow.html) | Visual representation of the Kanban board structure: boards, columns, task cards, WIP limits, priority tags, and how real-time diff events (`CREATED`, `UPDATED`, `MOVED`, `DELETED`) flow over WebSocket to connected clients. |
| [`user-task-lifecycle-swimlane.html`](user-task-lifecycle-swimlane.html) | Multi-actor swimlane diagram showing how a Developer, Project Lead, and Admin each interact with tasks — creation, assignment, status transitions, code execution, and audit review. |

---

## Web IDE & Developer Workflow

| File | What it shows |
|:---|:---|
| [`ide-virtual-filesystem-tree.html`](ide-virtual-filesystem-tree.html) | Hierarchical tree of how IDE files are stored in PostgreSQL (`ide_files` table) — the virtual folder/file structure scoped per project and how Monaco Editor reads and renders it. |
| [`developer-ide-run-journey.html`](developer-ide-run-journey.html) | User journey map tracing a developer's full workflow: project creation → IDE file editing → sandboxed code execution → live log debugging → Kanban task update → iteration. |
| [`developer-feedback-loop.html`](developer-feedback-loop.html) | Flywheel diagram of the developer productivity loop: write code in IDE → run in sandbox → inspect live logs → update Kanban task → iterate — showing how the platform's features reinforce each other. |

---

## Real-Time & WebSocket

| File | What it shows |
|:---|:---|
| [`websocket-stomp-routing.html`](websocket-stomp-routing.html) | Data flow diagram of the STOMP WebSocket broker — how messages are routed to `/topic/notifications/{userId}`, `/topic/logs/{projectId}`, and `/topic/tasks/{projectId}`, and how the `StompAuthChannelInterceptor` validates JWTs on CONNECT. |

---

## Observability, Logging & Metrics

| File | What it shows |
|:---|:---|
| [`telemetry-observability-layers.html`](telemetry-observability-layers.html) | Layer stack of the full observability pipeline: Spring Boot app → Logback / Micrometer instrumentation → Elasticsearch (logs) and Prometheus (metrics) → Kibana and Grafana dashboards. |
| [`logging-pipeline-medallion.html`](logging-pipeline-medallion.html) | Medallion architecture of the logging pipeline: Bronze (raw HTTP request logs) → Silver (filtered, structured JSON documents indexed into Elasticsearch) → Gold (aggregated error analytics and metric dashboards). |
| [`api-latency-traffic-heatmap.html`](api-latency-traffic-heatmap.html) | Heatmap of request volume and latency distribution across API endpoint groups (`/api/auth/*`, `/api/code-execution/*`, `/api/projects/*`) over a 24-hour interval. |
| [`system-request-distribution.html`](system-request-distribution.html) | Sankey diagram showing how inbound HTTP traffic splits across Auth requests, Kanban REST calls, WebSocket upgrades, sandbox execution runs, and Actuator scrapes. |
| [`resource-utilization-trends.html`](resource-utilization-trends.html) | Line chart of host CPU and RAM utilization trends during periods of concurrent Docker sandbox executions. |
| [`request-lifecycle-waterfall.html`](request-lifecycle-waterfall.html) | Microsecond-level waterfall trace of a single authenticated API request: nginx proxy → `JwtRequestFilter` → Redis blacklist check → Service layer → DB query → response serialization. |
| [`system-health-polar.html`](system-health-polar.html) | Polar/radial chart displaying the health status of each subsystem: DB connection pool, Redis latency, active WebSocket connections, JVM heap headroom, and sandbox container queue depth. |

---

## CI/CD & Deployment

| File | What it shows |
|:---|:---|
| [`github-actions-ci-cd-timeline.html`](github-actions-ci-cd-timeline.html) | Timeline of the GitHub Actions CI/CD pipeline: code checkout → Maven build and unit tests → Docker multi-stage image builds → SSH deployment restart on the Azure VM — with duration markers for each stage. |
| [`implementation-milestones-gantt.html`](implementation-milestones-gantt.html) | Gantt chart of the full project development timeline — from initial architecture and database design through feature implementation phases to 100% completion. |

---

## Architecture Strategy & Analysis

| File | What it shows |
|:---|:---|
| [`architectural-tradeoffs-radar.html`](architectural-tradeoffs-radar.html) | Radar chart evaluating the key architectural trade-offs of the monolith design: deployment simplicity, security isolation, real-time latency, observability depth, and horizontal scalability. |
| [`devops-platform-wardley-map.html`](devops-platform-wardley-map.html) | Wardley map positioning platform components on the evolution axis — custom IDE features and execution sandboxing (novel/differentiating) vs. commodity components like PostgreSQL, Docker, and OAuth providers. |
| [`feature-effort-value-matrix.html`](feature-effort-value-matrix.html) | Quadrant matrix evaluating platform features by business value vs. implementation effort — showing which features delivered the highest ROI. |
| [`product-features-story-map.html`](product-features-story-map.html) | User story map decomposing the platform into epics (Auth, Projects, Code Execution, Observability, IDE) and the individual user tasks under each. |
| [`portfolio-executive-summary.html`](portfolio-executive-summary.html) | Single-page executive summary diagram positioning DevOps Suite as a unified all-in-one developer productivity platform — intended for portfolio and presentation use. |
| [`testing-pyramid.html`](testing-pyramid.html) | Testing strategy pyramid: unit tests (JUnit 5 + Mockito) at the base → integration tests (Spring Boot Test + Testcontainers) → end-to-end API and UI tests at the top. |
