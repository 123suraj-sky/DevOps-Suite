# AGENTS.md — DevOps Suite

> **Universal context file for all AI coding agents.**
> Read this first before touching any file in this repository.
> For Gemini/Antigravity-specific rules, also read `GEMINI.md`.

---

## 📌 Project Overview

**DevOps Suite** is a full-stack developer productivity platform consisting of:
- A **monolithic Spring Boot backend** (`com.devopssuite.monolith`) running on port `8081`
- A **React 18 SPA frontend** running on port `5173`
- Infrastructure services managed via **Docker Compose** (PostgreSQL, Redis, Elasticsearch, Kibana, Prometheus, Grafana)

The platform provides: JWT-authenticated REST APIs, sandboxed code execution via Docker, a Kanban project manager, real-time WebSocket log streaming, and system metrics observability.

---

## 🗂️ Repository Layout

```
DevOps Suite/
├── backend/                  # Spring Boot monolith (Java 21, Maven)
│   └── src/main/java/com/devopssuite/monolith/
│       ├── auth/             # Registration, login, JWT, Google OAuth2
│       ├── project/          # Projects, boards, columns, tasks (Kanban)
│       ├── execution/        # Docker sandboxed code runner
│       ├── logging/          # Request logging + Elasticsearch pipeline
│       ├── metrics/          # Actuator / Prometheus scraping
│       ├── notification/     # Spring Events → WebSocket notifications
│       ├── security/         # JwtRequestFilter, Spring Security config
│       └── config/           # WebSocket, CORS, Redis, etc.
├── frontend/                 # React 18 + Vite SPA
│   └── src/
│       ├── api/              # Axios clients per domain
│       ├── components/       # Reusable UI components
│       ├── context/          # AuthContext, NotificationContext, WebSocketContext
│       └── pages/            # Login, Projects, Kanban, Code Editor, Logs, Metrics
├── docs/                     # Full design documentation (read before implementing)
│   ├── 01-requirements.md
│   ├── 02-architecture-hld.md
│   ├── 03-database-design.md
│   ├── 04-api-design.md
│   ├── 05-lld-detailed-design.md
│   ├── 06-security-design.md
│   └── ...
├── config/                   # External config files
├── scripts/                  # Helper scripts (e.g., init-databases.sql)
├── docker-compose.yml        # Full local infrastructure stack
├── .env / .env.example       # Environment variable definitions
├── AGENTS.md                 # ← You are here
├── GEMINI.md                 # Gemini/Antigravity-specific rules
└── .agents/                  # Extended agent context (memory, tasks, architecture)
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
| Docker Desktop | Latest | PostgreSQL, Redis, Elasticsearch, etc. |
| Java (JDK) | 21 | Compile & run Spring Boot backend |
| Maven | 3.9+ | Build the backend |
| Node.js | 20+ | Run the React frontend |

### Start Order

```bash
# 1. Start infra + backend (backend compiles inside Docker)
docker-compose up -d postgres redis backend
# → Backend runs at http://localhost:8081

# 2. Start frontend locally
cd frontend && npm install && npm run dev
# → Frontend runs at http://localhost:5173
```

### After backend code changes
```bash
docker-compose up -d --build backend
```

> **Note:** First build is ~2-3 min (Maven deps download). Subsequent builds are fast — deps layer is cached and only invalidated when `pom.xml` changes.

### Full observability stack (optional)
```bash
docker-compose up -d
# Adds: Grafana (3000), Kibana (5601), Prometheus (9090), Elasticsearch
```

### Stop everything
```bash
docker-compose down          # Stop containers
docker-compose down -v       # Stop + wipe volumes (fresh start)
```

---

## 🌐 Service Port Map

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:5173 | React SPA (Vite dev server) |
| Backend API | http://localhost:8081 | Spring Boot monolith |
| Backend WS | ws://localhost:8081/ws | STOMP over SockJS |
| Grafana | http://localhost:3000 | Metrics dashboards |
| Kibana | http://localhost:5601 | Log explorer |
| Prometheus | http://localhost:9090 | Raw metrics |

---

## 🏗️ Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Single monolith, not microservices** | Simplifies deployment, transactions, and referential integrity for a portfolio-scale project |
| **JWT-based auth** (access: 1h, refresh: 7d) | Stateless; token blacklisting via Redis on logout |
| **Docker sandbox for code execution** | Strong isolation — no network, read-only FS, 256MB RAM cap, 1 CPU, 30s timeout |
| **Spring Events instead of Kafka** | Internal async event dispatching without the Kafka/Zookeeper infrastructure overhead |
| **Redis for caching + rate limiting** | Cache-aside for users/projects; sliding-window counters for API rate limits |
| **STOMP/SockJS WebSocket** | Browser-compatible real-time for logs and notifications |
| **Flyway migrations** | All schema changes version-controlled; single DB `devopssuite` |

---

## 🔐 Security Rules (NEVER violate)

- **Never hardcode secrets.** All secrets come from `.env` or environment variables (`JWT_SECRET`, `DB_PASSWORD`, `GOOGLE_CLIENT_ID`).
- **All protected routes require a valid JWT.** The `JwtRequestFilter` validates tokens before any controller logic runs.
- **Code execution is sandboxed.** Docker containers must have `--no-network`, read-only FS, and enforced resource limits.
- **Passwords are BCrypt-hashed** (cost 12). Never store or log plain-text passwords.
- **RBAC roles:** `OWNER > ADMIN > MEMBER > VIEWER`. Always check permissions in the service layer.

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

### Frontend
- React 18, Vite, JavaScript (JSX)
- React Router v6 (lazy-loaded routes)
- Axios (with JWT interceptors)
- Monaco Editor (code editor)
- react-beautiful-dnd (Kanban drag-and-drop)
- SockJS + STOMP.js (WebSocket client)
- Recharts (metrics charts)
- Tailwind CSS

### Infrastructure
- PostgreSQL (single DB: `devopssuite`)
- Redis 7
- Elasticsearch + Kibana
- Prometheus + Grafana
- Docker Compose

---

## 📐 API Conventions

- **Base path:** `/api` (e.g., `/api/auth/login`, `/api/projects`)
- **Authentication:** `Authorization: Bearer <jwt>` header on all protected endpoints
- **Error format:** Consistent JSON `{ "error": "...", "message": "...", "status": 4xx }`
- **Rate limiting:** Redis-backed; returns `429 Too Many Requests` on breach
- **WebSocket topics:**
  - `/topic/notifications/{userId}` — in-app toast notifications
  - `/topic/logs/{projectId}` — real-time log streaming
  - `/topic/tasks/{projectId}` — live Kanban task updates

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
- Follow the established package structure under `com.devopssuite.monolith.*`
- Use Flyway migrations for ALL schema changes (never modify entities directly without a migration)
- Use the `.env` file for configuration — never hardcode values
- Check `.agents/TASKS.md` for current work in progress before starting
- Check `.agents/MEMORY.md` for known issues and past decisions

### ❌ DON'T
- Don't re-introduce Kafka, Zookeeper, or an API Gateway — this is a monolith
- Don't create new Spring Boot modules or Maven submodules
- Don't use `@Transactional` on controller methods — only service layer
- Don't bypass the `JwtRequestFilter` security chain
- Don't expose Docker socket to the application container in production
- Don't commit `.env` — use `.env.example` as the template
