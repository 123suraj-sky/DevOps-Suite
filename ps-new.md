> OAuth for secure API access — login via Google & GitHub

---

# Developer Productivity Platform (DevOps Suite)

## Problem Statement

Developers and engineering teams rely on a fragmented set of tools every day: an online judge or REPL to run code, a task board for project tracking, a log explorer for debugging, and a metrics dashboard for system health. Each tool solves one problem in isolation. Credentials, context, and data never travel together.

**DevOps Suite** addresses this by combining those workflows into one authenticated platform — a single place to write and run code safely, manage Kanban projects, stream logs in real time, and monitor API health. The goal is not to replicate enterprise SaaS at scale, but to build something that feels like real backend and DevOps engineering work: security, observability, sandboxed execution, and a polished React frontend — all in one cohesive product suitable for a portfolio and technical interviews.

---

## What It Becomes

A **DevOps + developer productivity platform** where a user can:

| Capability | What it does |
|---|---|
| **Run code** | Submit Java 21, Python 3.12, Node 24 (JavaScript), or C++ (g++ 15) in a browser Monaco editor; execute in an isolated Docker sandbox |
| **Manage work** | Create projects, Kanban boards, columns, and tasks with drag-and-drop, WIP limits, and audit history |
| **Code with IDE** | Full browser IDE with file tree persistence in PostgreSQL, project-scoped files and folders |
| **Monitor logs** | Search centralized logs in Elasticsearch and stream them live over WebSocket |
| **Track metrics** | Admins see system-wide health and API throughput/latency stats; members see personal activity summaries |
| **Stay notified** | Receive in-app toasts and emails when tasks are assigned, completed, or errors spike (with preference toggles) |
| **Social profiles** | Public profiles, avatar customization, follow/unfollow system, and activity heatmap |

Think of it as a **mini engineering workspace** — closer to how teams actually work than a standalone CRUD app or LeetCode clone.

---

## Architecture Decision: Monolith (Not Microservices)

The original blueprint called for microservices (Auth Service, API Gateway, Code Execution Service, etc.) with Kafka and Spring Cloud Gateway. That design was **intentionally simplified** into a **single Spring Boot monolith** running internally on port `8081` (host-mapped to `8082` via Docker).

### Why monolith?

| Reason | Detail |
|---|---|
| **Simpler deployment** | One JAR, one Docker image, one build pipeline |
| **Transactional integrity** | Projects, tasks, users, IDE files, and executions share one PostgreSQL schema with Flyway migrations (V1–V16) |
| **Lower operational overhead** | No service mesh, no inter-service networking, no distributed transaction headaches |
| **Portfolio-appropriate scale** | Demonstrates real engineering patterns without over-engineering for demo traffic |

### What we deliberately removed

- Separate microservice modules and API Gateway
- Kafka and Zookeeper (replaced by Spring `ApplicationEventPublisher` for async notifications)
- Per-service databases

### What we kept from the original vision

- JWT authentication (email/password + Google OAuth2 + GitHub OAuth2)
- Docker-sandboxed code execution (no network, resource limits, timeouts)
- Redis for caching, rate limiting, and token blacklisting
- Elasticsearch + Kibana for log search and auto-provisioned dashboards
- Prometheus + Grafana for metrics scraping and dashboards (via nginx admin proxy)
- WebSocket (STOMP/SockJS) for real-time logs, tasks, and notifications
- React SPA with Monaco Editor, Kanban board, and dashboards

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React 18 SPA (port 80 / 5173)            │
│  Login · Projects · Kanban · IDE · Logs · Admin · Metrics   │
└────────────────────────────┬────────────────────────────────┘
                             │ REST + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────┐
│    Spring Boot Monolith (host: 8082, container: 8081)       │
│  ┌─────────┬──────────┬───────────┬─────────┬────────────┐  │
│  │  auth   │ project  │ execution │ logging │  metrics   │  │
│  │   ide   │  admin   │           │         │ notification│ │
│  └─────────┴──────────┴───────────┴─────────┴────────────┘  │
│  JwtRequestFilter · RateLimitFilter · Flyway · Actuator     │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
       ▼              ▼              ▼
  PostgreSQL       Redis         Docker Engine
  (devopssuite)   (cache/rate)   (code sandbox)
       │
       ▼
  Elasticsearch → Kibana (nginx: 8083)
  Prometheus    → Grafana (nginx: 8080)
```

### Monolith modules (packages under `com.devopssuite`)

1. **auth** — Registration, login, JWT, refresh tokens, Google OAuth2, GitHub OAuth2, password reset via email, Redis token blacklist on logout, public user profiles & social follow system
2. **admin** — Admin user management, user activity explorer, cross-project user tasks and logs inspection (`ROLE_ADMIN` / `ROLE_OWNER`)
3. **project** — Projects, boards, columns, tasks (Kanban), task audit history (`task_audit_history`), RBAC (`OWNER > ADMIN > MEMBER > VIEWER`)
4. **execution** — Sandboxed code runner via Docker Java client (Python 3.12, Node 24, Java 21, C++ g++ 15), execution history & activity heatmap API
5. **ide** — Browser IDE file tree persistence in PostgreSQL (`ide_files`) scoped per project
6. **logging** — Request logging filter pipeline → Elasticsearch indexing & search
7. **metrics** — Actuator/Prometheus exposure, admin system health dashboard, and user personal summary APIs
8. **notification** — Spring Events → WebSocket in-app toasts & email notifications, user notification preferences (`notification_preferences`)
9. **security / config** — JWT filter, RateLimitFilter (Redis sliding window), CORS, WebSocket, Redis configuration, `DataSeeder`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.x, Spring Security, Spring Data JPA, Flyway (V1–V16) |
| Frontend | React 18, JavaScript (JSX), Vite, Tailwind CSS, Monaco Editor, Recharts |
| Database | PostgreSQL 16 (single DB: `devopssuite`) |
| Cache / rate limit | Redis 7 |
| Logs | Elasticsearch 8.12 + Kibana (auto-provisioned dashboards) |
| Metrics | Spring Actuator, Micrometer, Prometheus, Grafana |
| Real-time | STOMP over SockJS (`/ws`) |
| Sandbox | Docker (ephemeral containers, read-only FS, no network, 1 CPU, 256MB cap, 30s timeout) |
| Infra | Docker Compose (local full stack) + nginx admin proxy (HTTP Basic Auth) |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) |

---

## Current State (What Is Built)

Development is **100% feature-complete** (as of 2026-09-24); the project is in the **maintenance, manual testing, and bug-fixing** phase.

### Completed Features

- **Monolith backend scaffold** — Compiles cleanly under `com.devopssuite` and runs via Docker Compose on host port `8082` (container port `8081`).
- **Auth module** — Register, login, refresh, logout with Redis JWT blacklist, password rules, Google OAuth2, and GitHub OAuth2.
- **Password reset flow** — Email-based token reset (`POST /api/auth/forgot-password`, `POST /api/auth/reset-password`) using Spring Mail.
- **User profiles & social** — Public profile pages, avatar image upload/crop, follower/following lists, profile view counter, activity heatmaps.
- **Project module & Kanban** — Full Kanban CRUD with 16 Flyway migrations; task status transitions, task duplication, and task audit trail.
- **Full IDE** — Monaco Editor file explorer with file/folder CRUD persisted to PostgreSQL (`ide_files`).
- **Code execution sandbox** — Multi-language runner (Python 3.12, Node 24, Java 21, C++ g++ 15); resource-capped ephemeral Docker containers; execution history and heatmap API.
- **Notification system** — Dual delivery (WebSocket in-app toasts + HTML email notifications) with user-configurable preferences per event type (`V14`).
- **Elasticsearch logging pipeline** — Every HTTP request enriched (traceId, duration, clientIp, severity) and indexed to daily rolling indices; Kibana auto-provisioned.
- **Observability & Admin proxy** — Prometheus scraping, Grafana dashboards, nginx proxy protecting Grafana (`:8080`) and Kibana (`:8083`) via HTTP Basic Auth.
- **Frontend SPA** — React 18 + JSX, Vite, Tailwind CSS; 17 routes, dark/light theme toggle, role-based route guards (`AdminRoute`, `ProtectedRoute`).
- **Admin Panel** — Admin user management page (`/admin/users`) with real-time active user tracking, user task summaries, and user log search.

---

## Future Enhancements (Post-MVP)

- Kubernetes / Helm deployment manifests
- Additional execution languages (Go, Rust)
- End-to-end Cypress test suite (structure initialized in `cypress/`)
- Cloud deployment with serverless PostgreSQL (e.g., Neon)
- Distributed tracing (Zipkin) and circuit breakers (Resilience4j)

---

## Final Product Vision

**DevOps Suite** is a **production-quality portfolio project** that demonstrates:

```
✔ Monolithic Spring Boot backend with clean modular package design (com.devopssuite)
✔ JWT + Google & GitHub OAuth2 authentication with RBAC and Redis blacklisting
✔ Docker-sandboxed code execution engine (Python, Node, Java, C++)
✔ Kanban project management with live WebSocket updates and audit history
✔ Browser IDE with project-scoped database file persistence
✔ Centralized logging with Elasticsearch and live WebSocket streaming
✔ Metrics and health observability (Prometheus, Grafana, Actuator)
✔ React 18 SPA with Monaco Editor, drag-and-drop boards, and role-based dashboards
✔ Full local stack via Docker Compose with nginx admin proxy
✔ CI/CD pipeline (GitHub Actions)
```

### User experience by role

- **Guest** — Sign up or log in (email/password, Google, or GitHub)
- **Member** — Run code, create IDE files, manage projects/tasks, customize profile, view personal activity dashboard
- **Admin** — Full platform access, system-wide metrics, Elasticsearch logs, user/RBAC management, inspect user tasks and logs

### What makes it stand out

Unlike a simple todo app or coding challenge site, this project touches patterns recruiters expect from backend and DevOps engineers: **security filters, sandbox isolation, caching, sliding-window rate limiting, structured logging, WebSockets, database migrations, and full-stack observability** — all in one deployable system.

---

## Repository Layout

```
DevOps Suite/
├── backend/                    # Spring Boot monolith (Java 21, Maven)
│   └── src/main/java/com/devopssuite/
│       ├── auth/               # Auth, OAuth2, profile, social follow
│       ├── admin/              # Admin user management & log explorer
│       ├── project/            # Projects, boards, columns, tasks (Kanban)
│       ├── execution/          # Docker sandboxed code runner
│       ├── ide/                # IDE file persistence
│       ├── logging/            # Request logging + Elasticsearch pipeline
│       ├── metrics/            # Actuator / Prometheus scraping
│       ├── notification/       # Spring Events → WebSocket + email
│       ├── security/           # JwtRequestFilter, RateLimitFilter, RBAC
│       └── config/             # WebSocket, Redis, DataSeeder
├── frontend/                   # React 18 + Vite SPA (JavaScript/JSX)
├── docs/                       # Requirements, HLD, API design, security, etc.
├── docker-compose.yml          # Full local infrastructure stack
├── .env / .env.example
├── AGENTS.md                   # AI agent context & architecture rules
└── ps-new.md                   # ← This document
```

---

## Related Documentation

For implementation detail, see:

| Document | Purpose |
|---|---|
| `docs/01-requirements.md` | Functional and non-functional requirements |
| `docs/02-architecture-hld.md` | High-level design and diagrams |
| `docs/03-database-design.md` | Consolidated PostgreSQL schema & migrations |
| `docs/04-api-design.md` | REST endpoint contracts & WebSocket topics |
| `docs/05-lld-detailed-design.md` | Package structure & class responsibilities |
| `docs/06-security-design.md` | Auth flow, RBAC, sandbox security |
| `docs/15-configuration-guide.md` | Environment variables and configuration |
| `AGENTS.md` | Running locally, ports, agent rules |
| `.agents/TASKS.md` | Current status and completion notes |
