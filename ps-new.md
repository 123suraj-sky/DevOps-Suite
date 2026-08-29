> OAuth for secure API access — login via Google

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
| **Run code** | Submit Java, Python, or JavaScript in a browser editor; execute in an isolated Docker sandbox |
| **Manage work** | Create projects, Kanban boards, columns, and tasks with drag-and-drop |
| **Monitor logs** | Search centralized logs and stream them live over WebSocket |
| **Track metrics** | Admins see system-wide health and API stats; members see personal activity summaries |
| **Stay notified** | Receive in-app toasts when tasks are assigned or errors spike |

Think of it as a **mini engineering workspace** — closer to how teams actually work than a standalone CRUD app or LeetCode clone.

---

## Architecture Decision: Monolith (Not Microservices)

The original blueprint called for microservices (Auth Service, API Gateway, Code Execution Service, etc.) with Kafka and Spring Cloud Gateway. That design was **intentionally simplified** into a **single Spring Boot monolith** running on port `8081`.

### Why monolith?

| Reason | Detail |
|---|---|
| **Simpler deployment** | One JAR, one Docker image, one build pipeline |
| **Transactional integrity** | Projects, tasks, users, and executions share one PostgreSQL schema with Flyway migrations |
| **Lower operational overhead** | No service mesh, no inter-service networking, no distributed transaction headaches |
| **Portfolio-appropriate scale** | Demonstrates real engineering patterns without over-engineering for demo traffic |

### What we deliberately removed

- Separate microservice modules and API Gateway
- Kafka and Zookeeper (replaced by Spring `ApplicationEventPublisher` for async notifications)
- Per-service databases

### What we kept from the original vision

- JWT authentication (email/password + Google OAuth2)
- Docker-sandboxed code execution (no network, resource limits, timeouts)
- Redis for caching and rate limiting
- Elasticsearch + Kibana for log search
- Prometheus + Grafana for metrics scraping
- WebSocket (STOMP/SockJS) for real-time logs and notifications
- React SPA with Monaco Editor, Kanban board, and dashboards

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React 18 SPA (port 5173)                 │
│  Login · Projects · Kanban · Code Editor · Logs · Metrics   │
└────────────────────────────┬────────────────────────────────┘
                             │ REST + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────┐
│           Spring Boot Monolith (port 8081)                  │
│  ┌─────────┬──────────┬───────────┬─────────┬────────────┐  │
│  │  auth   │ project  │ execution │ logging │  metrics   │  │
│  │         │          │           │         │ notification│  │
│  └─────────┴──────────┴───────────┴─────────┴────────────┘  │
│  JwtRequestFilter · Spring Security · Flyway · Actuator     │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
       ▼              ▼              ▼
  PostgreSQL       Redis         Docker Engine
  (devopssuite)   (cache/rate)   (code sandbox)
       │
       ▼
  Elasticsearch → Kibana
  Prometheus    → Grafana
```

### Monolith modules (packages under `com.devopssuite.monolith`)

1. **auth** — Registration, login, JWT, refresh tokens, Google OAuth2, Redis token blacklist on logout
2. **project** — Projects, boards, columns, tasks (Kanban), RBAC (`OWNER > ADMIN > MEMBER > VIEWER`)
3. **execution** — Sandboxed code runner via Docker Java client
4. **logging** — Request logging pipeline → Elasticsearch
5. **metrics** — Actuator/Prometheus exposure + dashboard APIs
6. **notification** — Spring Events → WebSocket in-app notifications
7. **security / config** — JWT filter, CORS, WebSocket, Redis configuration

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.x, Spring Security, Spring Data JPA, Flyway |
| Frontend | React 18, Vite, Tailwind CSS, Monaco Editor, react-beautiful-dnd, Recharts |
| Database | PostgreSQL (single DB: `devopssuite`) |
| Cache / rate limit | Redis 7 |
| Logs | Elasticsearch + Kibana |
| Metrics | Spring Actuator, Micrometer, Prometheus, Grafana |
| Real-time | STOMP over SockJS (`/ws`) |
| Sandbox | Docker (ephemeral containers, read-only FS, no network) |
| Infra | Docker Compose (local full stack) |

---

## Current State (What Is Built)

Development is **feature-complete**; the project is in **manual testing and bug-fixing** phase.

### Done

- Monolith backend scaffold — compiles and runs in Docker on port `8081`
- Auth module — register, login, refresh, logout with JWT blacklist, password validation, Google OAuth2
- Project module — full Kanban CRUD with Flyway migrations
- Frontend — routing, auth context, API clients, pages for Login, Projects, Kanban, Code Editor, Logs, Metrics
- Docker Compose — PostgreSQL, Redis, Elasticsearch, Kibana, Prometheus, Grafana
- Metrics dashboard — admin API wired to Actuator and repository counts
- Architecture migration — microservices → monolith completed; stale gateway/Kafka removed

### Partially done / in QA

- Code execution sandbox — core classes exist; Docker runner integration needs completion and testing
- Elasticsearch logging pipeline — structured logs emitted; indexing pipeline needs wiring
- WebSocket end-to-end — config and topics exist; live integration with frontend needs verification
- Frontend ↔ backend integration — all pages scaffolded; full flow testing against live backend ongoing

---

## Planned Work (Before "Done")

| Priority | Task |
|---|---|
| High | Finish Docker sandbox execution (Python/Java/JS smoke tests) |
| High | Wire Elasticsearch log indexing; verify Kibana index pattern |
| High | End-to-end WebSocket testing (logs, notifications, task updates) |
| High | GitHub Actions CI/CD — build, test, Docker image push |
| High | Replace hardcoded dev admin seed credentials with env-driven setup |
| Medium | Full frontend integration QA across all pages |
| Medium | Production-hardening: remove dev-only defaults before deploy |

---

## Stretch Goals (Post-MVP)

- Kubernetes / Helm deployment manifests
- Additional execution languages (Go, Rust, C++)
- Email notifications (currently in-app WebSocket only)
- Password reset flow (requires SMTP integration)
- End-to-end Cypress tests
- Migrate PostgreSQL to Neon (serverless) for cloud deployment
- Distributed tracing (Zipkin) and circuit breakers (Resilience4j)
- CI/CD staging vs production branch strategy

---

## Final Product Vision

When complete, **DevOps Suite** is a **production-quality portfolio project** that demonstrates:

```
✔ Monolithic Spring Boot backend with modular package design
✔ JWT + OAuth2 authentication with RBAC
✔ Docker-sandboxed code execution engine
✔ Kanban project management with real-time task updates
✔ Centralized logging with Elasticsearch and live WebSocket streaming
✔ Metrics and health observability (Prometheus, Grafana, Actuator)
✔ React SPA with Monaco Editor, drag-and-drop boards, and role-based dashboards
✔ Full local stack via Docker Compose
✔ CI/CD pipeline (GitHub Actions)
```

### User experience by role

- **Guest** — Sign up or log in (email or Google)
- **Member** — Run code, manage own projects/tasks, view personal activity dashboard
- **Admin** — Full platform access, system-wide metrics, all logs, user/RBAC management

### What makes it stand out

Unlike a simple todo app or coding challenge site, this project touches patterns recruiters expect from backend engineers: **security filters, sandbox isolation, caching, rate limiting, structured logging, WebSockets, database migrations, and observability** — all in one deployable system.

---

## Repository Layout

```
DevOps Suite/
├── backend/                    # Spring Boot monolith (Java 21, Maven)
│   └── src/main/java/com/devopssuite/monolith/
│       ├── auth/
│       ├── project/
│       ├── execution/
│       ├── logging/
│       ├── metrics/
│       ├── notification/
│       ├── security/
│       └── config/
├── frontend/                   # React 18 + Vite SPA
├── docs/                       # Requirements, HLD, API design, security, etc.
├── docker-compose.yml          # Full local infrastructure stack
├── .env / .env.example
├── AGENTS.md                   # AI agent context (architecture rules)
└── ps-new.md                   # ← This document
```

---

## Reality Check

This is **not**:

- A one-week CRUD tutorial
- A microservices demo with 7 separate deployables
- An enterprise multi-tenant SaaS

This **is**:

- A **2–3 month serious build** (mostly complete)
- A **monolithic, portfolio-scale** backend engineering project
- Something that reads on a resume like real DevOps/backend work

---

## Related Documentation

For implementation detail, see:

| Document | Purpose |
|---|---|
| `docs/01-requirements.md` | Functional and non-functional requirements |
| `docs/02-architecture-hld.md` | High-level design and diagrams |
| `docs/04-api-design.md` | REST endpoint contracts |
| `docs/06-security-design.md` | Auth flow, RBAC, sandbox security |
| `AGENTS.md` | Running locally, ports, agent rules |
| `.agents/TASKS.md` | Current backlog and completion status |
