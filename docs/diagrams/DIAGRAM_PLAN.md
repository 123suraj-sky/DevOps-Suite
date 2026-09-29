# DevOps Suite — Master Diagram Generation Plan

This plan organizes and maps **all 41 diagram types** supported by the [`diagram-design`](file:///d:/Projects/DevOps%20Suite/.agents/skills/diagram-design) skill directly to **DevOps Suite** features, architecture, database schemas, workflows, and operations.

All diagrams will be self-contained HTML/SVG documents matching the editorial design system established in [`system-architecture.html`](file:///d:/Projects/DevOps%20Suite/docs/diagrams/system-architecture.html) and stored under [`docs/diagrams/`](file:///d:/Projects/DevOps%20Suite/docs/diagrams/).

---

## 🗺️ Categorized Diagram Roadmap (All 41 Types)

### Phase 1: Core Architecture, Sandboxing & Security (Highest Value)
*Essential technical documentation for architecture reviews, developer onboarding, and portfolio presentation.*

| # | Diagram Type | Filename | Project Target & Scenario |
|---|---|---|---|
| 1 | **Architecture** | [`system-architecture.html`](file:///d:/Projects/DevOps%20Suite/docs/diagrams/system-architecture.html) | *(Completed)* Full-system topology (Monolith, React SPA, Docker sandbox, Redis, Postgres, ELK, Prometheus, Grafana). |
| 2 | **Process** | `code-execution-lifecycle.html` | Step-by-step Docker runner lifecycle: IDE submission $\rightarrow$ Spring async queue $\rightarrow$ Docker Java API $\rightarrow$ isolated container $\rightarrow$ log extraction $\rightarrow$ cleanup. |
| 3 | **Sequence** | `auth-oauth2-jwt-sequence.html` | Full sequence for Google/GitHub OAuth2 & local auth: code exchange, JWT issuance (1h access / 7d refresh), Redis token blacklist check, and interceptors. |
| 4 | **DB Schema** | `db-schema-flyway.html` | Complete schema layout of Flyway migrations `V1`–`V16` (users, roles, projects, boards, columns, tasks, task_history, ide_files, audit_logs). |
| 5 | **Data Flow** | `websocket-stomp-routing.html` | Live message flow across STOMP broker: `/topic/notifications/{userId}`, `/topic/logs/{projectId}`, and `/topic/tasks/{projectId}`. |
| 6 | **Deployment** | `docker-compose-deployment.html` | Host vs. container networking, port mappings (8082 $\rightarrow$ 8081, 80, 8080, 8083, 9090), volume persistences, and bridge network boundaries. |
| 7 | **DP Security Matrix**| `rbac-security-matrix.html` | Complete role-based access control matrix across roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) vs. system operations & endpoints. |
| 8 | **State Machine** | `kanban-task-state-machine.html` | Kanban task status transitions (`Backlog` $\rightarrow$ `To Do` $\rightarrow$ `In Progress` $\rightarrow$ `Review` $\rightarrow$ `Done`) with validation guards and event triggers. |

---

### Phase 2: Feature Workflows & Domain Logic (Product & UX)
*Visual specifications for Kanban, Web IDE, notification pipelines, and user flows.*

| # | Diagram Type | Filename | Project Target & Scenario |
|---|---|---|---|
| 9 | **Kanban** | `kanban-board-workflow.html` | Visual representation of boards, columns, task cards, WIP limits, priority tags, and real-time diff events. |
| 10 | **Swimlane** | `user-task-lifecycle-swimlane.html` | Multi-actor swimlane (Developer, Project Lead, Admin) interacting with tasks, code reviews, and sandbox executions. |
| 11 | **User Journey** | `developer-ide-run-journey.html` | Journey map of a developer: project creation $\rightarrow$ IDE file editing $\rightarrow$ sandboxed code execution $\rightarrow$ log debugging $\rightarrow$ task completion. |
| 12 | **ER Diagram** | `entity-relationships.html` | Pure entity-relationship model highlighting foreign keys, cascades, composite keys, and indexing strategies. |
| 13 | **Tree** | `ide-virtual-filesystem-tree.html` | Hierarchical tree of IDE files stored in DB (`ide_files`) scoped per project and rendered in Monaco Editor. |
| 14 | **Flowchart** | `rate-limiting-decision-tree.html` | Redis sliding-window algorithm flowchart: key evaluation, sliding window calculation, counter increment, and 429 breach actions. |
| 15 | **Timeline** | `github-actions-ci-cd-timeline.html` | CI/CD build timeline: checkout $\rightarrow$ Maven build & unit tests $\rightarrow$ Docker multi-stage images $\rightarrow$ deployment restart. |
| 16 | **Story Map** | `product-features-story-map.html` | User story map decomposing epics (Auth, Projects, Execution, Observability) into user tasks and release iterations. |
| 17 | **Nested** | `project-domain-aggregates.html` | Domain-Driven Design (DDD) aggregate boundaries: Project Aggregate (Board, Column, Task), User Aggregate, Execution Aggregate. |
| 18 | **UML Class** | `backend-domain-classes.html` | Core backend domain classes and relationships under `com.devopssuite` (entities, repositories, services, interceptors). |

---

### Phase 3: Observability, Metrics & Telemetry (Data & DevOps)
*Deep-dive schematics for monitoring, logs, performance, and data distribution.*

| # | Diagram Type | Filename | Project Target & Scenario |
|---|---|---|---|
| 19 | **Layers** | `telemetry-observability-layers.html` | Layer stack of observability: Monolith App $\rightarrow$ Spring Logback / Micrometer $\rightarrow$ Pipeline (ELK & Prometheus) $\rightarrow$ Dashboards (Kibana & Grafana). |
| 20 | **Medallion** | `logging-pipeline-medallion.html` | Raw HTTP Request logs (Bronze) $\rightarrow$ Filtered & Structured JSON logs (Silver) $\rightarrow$ Aggregated error analytics & metric dashboards (Gold). |
| 21 | **Heatmap** | `api-latency-traffic-heatmap.html` | Request volume and latency distribution across endpoints (`/api/auth/*`, `/api/execution/*`, `/api/projects/*`) across 24h intervals. |
| 22 | **Sankey** | `system-request-distribution.html` | Flow of inbound HTTP requests split into Auth, Kanban REST, WebSocket upgrades, Sandbox runs, and Actuator scrapes. |
| 23 | **Bar Chart** | `code-execution-language-stats.html` | Execution performance and memory usage benchmark breakdown by runtime (Java, Python, Node.js, Go). |
| 24 | **Line Chart** | `resource-utilization-trends.html` | Host CPU & RAM trends during concurrent Docker code executions over time. |
| 25 | **Scatter Chart**| `execution-memory-vs-duration.html` | Code execution job duration (seconds) plotted against peak memory consumption (MB). |
| 26 | **Waterfall** | `request-lifecycle-waterfall.html` | Microsecond waterfall trace of an authenticated request: Nginx proxy $\rightarrow$ JwtFilter $\rightarrow$ Redis check $\rightarrow$ Service $\rightarrow$ DB query $\rightarrow$ Response serialization. |
| 27 | **Polar Chart** | `system-health-polar.html` | Polar/radial chart displaying subsystem health metrics: DB pool, Redis latency, WS connections, JVM heap headroom, Sandbox container queue. |

---

### Phase 4: Strategy, Operations & Quality (System Engineering)
*Engineering analysis, system dependencies, incident analysis, and structural comparisons.*

| # | Diagram Type | Filename | Project Target & Scenario |
|---|---|---|---|
| 28 | **Dependency** | `service-dependency-graph.html` | Inter-service dependency and blast-radius graph between backend modules, databases, caching layers, and external OAuth APIs. |
| 29 | **Quadrant** | `feature-effort-value-matrix.html` | Feature matrix evaluating upcoming vs completed DevOps Suite features (Matrix: High/Low Value vs High/Low Complexity). |
| 30 | **Radar** | `architectural-tradeoffs-radar.html` | Radar evaluation of architectural trade-offs: Monolith simplicity, Security isolation, Real-time latency, Deployment ease, and Observability depth. |
| 31 | **Loop / Flywheel** | `developer-feedback-loop.html` | Developer productivity flywheel: Write code in IDE $\rightarrow$ Run in sandbox $\rightarrow$ Inspect live logs $\rightarrow$ Update Kanban $\rightarrow$ Iterate. |
| 32 | **Treemap** | `backend-codebase-composition.html` | Proportional tree map of Java codebase packages (`com.devopssuite.auth`, `execution`, `project`, `security`, `logging`, `notification`). |
| 33 | **Fishbone** | `sandbox-failure-cause-analysis.html` | Ishikawa / Fishbone root cause diagram for execution failure modes (OOM kill, container timeout, network leak attempt, Docker socket failure). |
| 34 | **Venn Diagram**| `security-cross-cutting-concerns.html` | Intersecting security concerns: JWT Stateless Auth, Redis Blacklisting, RBAC Authorizations, and Docker Kernel Sandboxing. |
| 35 | **Pyramid** | `testing-pyramid.html` | DevOps Suite test strategy pyramid: Unit tests (JUnit 5/Mockito) $\rightarrow$ Integration tests (Spring Boot Test + Testcontainers) $\rightarrow$ End-to-end API/UI tests. |
| 36 | **Wardley Map**| `devops-platform-wardley-map.html` | Evolution map of platform components: Custom IDE features vs Commodity databases, Docker sandboxing, and OAuth providers. |
| 37 | **IT Current State** | `infrastructure-current-state.html` | Exact host topology, environment variables, filesystem volumes, and container states in local Docker Compose. |
| 38 | **High-Level** | `portfolio-executive-summary.html` | Executive 1-page high-level concept diagram summarizing DevOps Suite as an all-in-one developer productivity suite. |
| 39 | **Org Chart** | `team-rbac-hierarchy.html` | Hierarchical structure of project teams, role delegations, and administrative supervisory tiers. |
| 40 | **Gantt Chart** | `implementation-milestones-gantt.html` | Project development timeline and milestone phases from initial architecture to 100% completion. |
| 41 | **DP Integration**| `third-party-integrations-map.html` | Integration boundaries: Google OAuth2, GitHub OAuth2, Docker Engine API, SMTP Mail servers, and Prometheus scrapers. |

---

## 🎨 Quality & Design Standards

Every generated diagram adheres to:
1. **Editorial Design Standard**: High-contrast slate theme (`#1e232d`), crisp typographic hierarchy, coral focal nodes (`#f08a59`), and semantic color tokens.
2. **Typography**: Google Fonts CDN (`Instrument Serif`, `Geist Sans`, `Geist Mono`).
3. **Geometry**: 100% vector SVG, orthogonal right-angle routing, zero blurry bitmap assets, zero generic Mermaid styling.
4. **Validation**: Verified against `.agents/skills/diagram-design/scripts/self_check.py` before release.
