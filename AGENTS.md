# AGENTS.md — DevOps Suite

> **Universal context file for all AI coding agents.**
> Read this first before touching any file in this repository.
> For Gemini/Antigravity-specific rules, also read `GEMINI.md`.

---

## 📌 Project Overview

**DevOps Suite** is a full-stack developer productivity platform consisting of:
- A **monolithic Spring Boot backend** (`com.devopssuite`) running internally on port `8081`, host-exposed at `8082` via Docker
- A **React 18 SPA frontend** (JavaScript/JSX + Vite + Tailwind CSS) — served locally at `5173` or via Docker nginx at `80`
- Infrastructure services managed via **Docker Compose** (PostgreSQL, Redis, Elasticsearch, Kibana, Prometheus, Grafana, nginx admin proxy)

The platform provides: JWT-authenticated REST APIs, sandboxed code execution via Docker, a Kanban project manager, a full-featured IDE, real-time WebSocket log streaming, notification system (in-app + email), and system metrics observability.

**Status: 100% COMPLETE as of 2026-09-24.**

---

## 🗂️ Repository Layout

```
DevOps Suite/
├── backend/                    # Spring Boot monolith (Java 21, Maven)
│   └── src/main/java/com/devopssuite/
│       ├── auth/               # Registration, login, JWT, Google OAuth2, GitHub OAuth2, password reset
│       ├── admin/              # Admin user management endpoints
│       ├── project/            # Projects, boards, columns, tasks (Kanban)
│       ├── execution/          # Docker sandboxed code runner (async queue worker)
│       ├── ide/                # IDE file persistence API
│       ├── logging/            # Request logging + Elasticsearch pipeline
│       ├── metrics/            # Actuator / Prometheus scraping
│       ├── notification/       # Spring Events → WebSocket + email notifications
│       ├── security/           # JwtRequestFilter, StompAuthChannelInterceptor, Spring Security config
│       └── config/             # WebSocket, CORS, Redis, DataSeeder, etc.
├── frontend/                   # React 18 + Vite + JavaScript (JSX) + Tailwind CSS
│   └── src/
│       ├── api/                # Axios clients per domain (13 files)
│       ├── assets/             # SVG icons (NN_name.svg naming convention)
│       ├── components/         # Reusable UI components
│       ├── context/            # AuthContext, WebSocketContext, NotificationContext,
│       │                       # EditorContext, ProjectsContext, ThemeContext
│       ├── hooks/              # Custom React hooks
│       ├── pages/              # Route-level page components
│       └── utils/              # Utility functions
├── docs/                       # Full design documentation (read before implementing)
│   ├── 01-requirements.md
│   ├── 02-architecture-hld.md
│   ├── 03-database-design.md
│   ├── 04-api-design.md
│   ├── 05-lld-detailed-design.md
│   ├── 06-security-design.md
│   ├── 07-deployment-devops.md
│   ├── 09-monitoring-observability.md
│   └── 11-frontend-design.md
├── config/                     # External config files
│   ├── nginx/nginx.conf        # Admin proxy config (Grafana + Kibana with Basic Auth)
│   ├── kibana/init-kibana.sh   # Kibana auto-provisioning script
│   └── prometheus/prometheus.yml
├── scripts/                    # Helper scripts
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD pipeline
├── docker-compose.yml          # Full local infrastructure stack
├── .env / .env.example         # Environment variable definitions
├── README.md                   # Project readme
├── progress.md                 # Implementation status (100% complete)
├── AGENTS.md                   # ← You are here
├── GEMINI.md                   # Gemini/Antigravity-specific rules
└── .agents/                    # Extended agent context (memory, tasks, architecture)
    ├── MEMORY.md
    ├── ARCHITECTURE.md
    ├── TASKS.md
    └── rules/
        └── coding-conventions.md
```

---

## 🚀 How to Run Locally

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Docker Desktop | Latest | Runs all services (backend, frontend nginx, PostgreSQL, Redis, Elasticsearch, etc.) |
| Java (JDK) | 21 | Only needed for local (non-Docker) backend builds |
| Maven | 3.9+ | Only needed for local (non-Docker) backend builds |
| Node.js | 24+ | Only needed for local (non-Docker) frontend dev |

### Option A — Full Docker Stack (Recommended)

```bash
# Start everything: backend + frontend nginx + all infra
docker-compose up -d
# → Frontend at http://localhost:80
# → Backend API at http://localhost:8082
```

**After backend code changes:**
```bash
docker-compose up -d --build backend
```

**After frontend code changes:**
```bash
docker-compose up -d --build frontend
```

### Option B — Docker backend + Local frontend dev (hot-reload)

```bash
# Start infra + backend in Docker
docker-compose up -d postgres redis elasticsearch kibana prometheus grafana backend

# Start frontend locally for hot-reload
cd frontend && npm install && npm run dev
# → Frontend at http://localhost:5173
# → Set VITE_API_URL=http://localhost:8082 in frontend/.env
```

> **Note:** First build is ~2-3 min (Maven downloads dependencies). Subsequent builds are fast — deps layer is cached and only invalidated when `pom.xml` changes.

### Stop Everything

```bash
docker-compose down          # Stop containers
docker-compose down -v       # Stop + wipe volumes (fresh start)
```

---

## 🌐 Service Port Map

| Service | URL | Notes |
|---|---|---|
| Frontend (Docker nginx) | http://localhost:80 | Production-built React SPA |
| Frontend (local dev) | http://localhost:5173 | Vite dev server (Option B only) |
| Backend API (Docker) | http://localhost:8082 | Spring Boot monolith (internal: 8081, host-mapped: 8082) |
| Backend WS (Docker) | ws://localhost:8082/ws | STOMP over SockJS |
| Grafana | http://localhost:8080 | Metrics dashboards — nginx proxy, Basic Auth required |
| Kibana | http://localhost:8083 | Log explorer — nginx proxy, Basic Auth required |
| Prometheus | http://localhost:9090 | Raw metrics scrape endpoint |

> **Grafana and Kibana** are NOT directly exposed on their default ports (3000 / 5601). They are proxied through nginx at 8080 / 8083 with HTTP Basic Auth. Set `ADMIN_PASSWORD` in `.env` before starting.

---

## 🏗️ Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Single monolith, not microservices** | Simplifies deployment, transactions, and referential integrity for a portfolio-scale project |
| **Base package `com.devopssuite`** | Flat monolith under one root package; no Maven submodules |
| **JWT-based auth** (access: 1h, refresh: 7d) | Stateless; token blacklisting via Redis on logout |
| **Google + GitHub OAuth2** | Two social login providers via Spring OAuth2 |
| **Docker sandbox for code execution** | Strong isolation — no network, read-only FS, 256MB RAM cap, 1 CPU, 30s timeout |
| **Spring Events instead of Kafka** | Internal async event dispatching without the Kafka/Zookeeper infrastructure overhead |
| **Redis for caching + rate limiting** | Cache-aside for users/projects; sliding-window counters for Auth, Execution, and API rate limits |
| **STOMP/SockJS WebSocket** | Browser-compatible real-time for logs, Kanban updates, and notifications |
| **Flyway migrations** | All schema changes version-controlled; 16 migrations (V1–V16); single DB `devopssuite` |
| **Nginx admin proxy** | Grafana + Kibana behind HTTP Basic Auth; not directly exposed |
| **Multi-stage Docker builds** | Frontend: Vite → nginx; Backend: Maven → JRE alpine |
| **IDE file persistence** | IDE files stored in DB (`ide_files` table); scoped per project |

---

## 🔐 Security Rules (NEVER violate)

- **Never hardcode secrets.** All secrets come from `.env` or environment variables (`JWT_SECRET`, `DB_PASSWORD`, `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`, `ADMIN_PASSWORD`).
- **All protected routes require a valid JWT.** The `JwtRequestFilter` validates tokens before any controller logic runs.
- **STOMP connections require JWT.** `StompAuthChannelInterceptor` validates JWT signature + Redis blacklist on STOMP CONNECT.
- **Code execution is sandboxed.** Docker containers must have `--no-network`, resource limits enforced. Never relax sandbox constraints.
- **Passwords are BCrypt-hashed** (cost 12). Never store or log plain-text passwords.
- **RBAC roles:** `OWNER > ADMIN > MEMBER > VIEWER`. Always check permissions in the service layer.
- **Don't expose Docker socket** to the application container in production.

---

## 🧑‍💻 Technology Stack

### Backend
- Java 21, Spring Boot 3.x
- Spring Security + JWT (JJWT library)
- Spring Data JPA + Flyway (PostgreSQL)
- Spring Data Redis (Lettuce client)
- Spring WebSocket (STOMP/SockJS)
- Docker Java client (code sandbox)
- Spring Actuator + Micrometer/Prometheus
- Google OAuth2 (Spring OAuth2 Resource Server)
- GitHub OAuth2 (authorization code exchange)
- Spring Mail (email notifications + password reset)

### Frontend
- React 18, Vite, **JavaScript (JSX)** — NOT TypeScript
- React Router v6 (lazy-loaded routes)
- Axios (with JWT interceptors)
- Monaco Editor (code editor, IDE)
- SockJS + STOMP.js (WebSocket client)
- Recharts (metrics charts)
- Tailwind CSS

### Infrastructure
- PostgreSQL (single DB: `devopssuite`)
- Redis 7
- Elasticsearch + Kibana (with auto-provisioned dashboards)
- Prometheus + Grafana
- nginx (admin proxy + frontend serving)
- Docker Compose

---

## 📐 API Conventions

- **Base path:** `/api` (e.g., `/api/auth/login`, `/api/projects`)
- **Authentication:** `Authorization: Bearer <jwt>` header on all protected endpoints
- **Error format:** Consistent JSON `{ "error": "...", "message": "...", "status": 4xx }`
- **Rate limiting:** Redis-backed; returns `429 Too Many Requests` on breach; configurable via `RATE_LIMIT_EXECUTION_MAX`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_API_MAX`
- **Log correlation:** `X-Project-Id` header injected by frontend for project-scoped log routing
- **WebSocket topics:**
  - `/topic/notifications/{userId}` — in-app toast notifications
  - `/topic/logs/{projectId}` — real-time log streaming
  - `/topic/tasks/{projectId}` — live Kanban task updates (granular diffs: CREATED/UPDATED/STATUS_CHANGED/MOVED/DELETED)

---

## 📚 Key Documentation

Before implementing any feature, read the relevant doc in `docs/`:

| Doc | Read When |
|---|---|
| [01-requirements.md](docs/01-requirements.md) | Understanding what to build |
| [02-architecture-hld.md](docs/02-architecture-hld.md) | System overview & design decisions |
| [03-database-design.md](docs/03-database-design.md) | Schema, entities, relationships |
| [04-api-design.md](docs/04-api-design.md) | REST endpoint contracts |
| [05-lld-detailed-design.md](docs/05-lld-detailed-design.md) | Package structure, class responsibilities |
| [06-security-design.md](docs/06-security-design.md) | Auth flow, RBAC, sandbox security |
| [11-frontend-design.md](docs/11-frontend-design.md) | Frontend component design |

---

## ⚠️ Agent DO / DON'T Rules

### ✅ DO
- Read `docs/` files relevant to your task before implementing
- Follow the established package structure under `com.devopssuite.*` (NOT `com.devopssuite.monolith`)
- Use Flyway migrations for ALL schema changes (never modify entities directly without a migration)
- Use the `.env` file for configuration — never hardcode values
- Check `.agents/TASKS.md` for current work in progress before starting
- Check `.agents/MEMORY.md` for known issues and past decisions
- **Use imported SVG assets for all icons.** Place SVG files in `frontend/src/assets/` following the existing numbering convention (`NN_name.svg`, e.g. `17_edit.svg`). Import them in components (`import editIcon from '../../assets/17_edit.svg'`) and render with `<img src={icon} alt="..." className="w-X h-X" />`.

### ❌ DON'T
- Don't re-introduce Kafka, Zookeeper, or an API Gateway — this is a monolith
- Don't create new Spring Boot modules or Maven submodules
- Don't use `@Transactional` on controller methods — only service layer
- Don't bypass the `JwtRequestFilter` security chain
- Don't expose Docker socket to the application container in production
- Don't commit `.env` — use `.env.example` as the template
- Don't use TypeScript — the frontend is JavaScript (JSX) only
- **Don't use inline SVGs** (`<svg>...</svg>`) for static icons in JSX — always import from `src/assets/` instead. Exception: dynamic/animated SVGs (e.g. loading spinners) may stay inline.
- **Don't use emojis as UI icons** in components. Use SVG assets instead.
- Don't reference a standalone `/metrics` page — metrics are embedded in the admin Dashboard (`/`)
- Don't assume the backend is on port 8081 on the host — it is host-mapped to **8082**
