# DevOps Suite

A full-stack developer productivity platform built with a monolithic Spring Boot backend, a React 18 frontend, and a full observability + infrastructure stack.

---

## ✨ Features

- **Authentication** — Register, login, logout with JWT (access: 1h, refresh: 7d), Redis-backed token blacklist, Google OAuth2, GitHub OAuth2, and a full password-reset flow (forgot + reset via email link)
- **Kanban Project Manager** — Projects, boards, columns, and tasks with real-time WebSocket updates; task management via context menu and edit modal
- **Full IDE** — Per-project IDE with file explorer, editor tabs, Monaco editor, output panel, and HTML preview; files persisted server-side
- **Code Execution Sandbox** — Sandboxed Docker execution for Python 3.12, Node.js 24, Java 21, C++ (g++ 15); async queue worker; 30s timeout, 256MB RAM cap, no network
- **Real-time Notifications** — In-app WebSocket toasts + email delivery; 6 notification types; per-user in-app × email preferences
- **Observability** — Elasticsearch logging (180-day ILM retention), Kibana auto-provisioned dashboards (Observability, Security, Analytics), Prometheus + Grafana metrics
- **Metrics Dashboard** — Admin dashboard with Recharts charts (request throughput, latency, error rate) and service health panels
- **Admin Panel** — Admin-only `/admin/users` page to manage users and roles
- **User Profiles** — Avatar customization (presets + custom URL + crop modal), activity heatmap, stats, follow/unfollow, notification preferences
- **Dark / Light theme** — Persisted per-user in localStorage
- **Rate Limiting** — Redis sliding-window rate limiting for Auth, Execution, and general API endpoints
- **Nginx Admin Proxy** — Grafana and Kibana proxied through nginx with HTTP Basic Auth protection

---

## Prerequisites

| Tool | Purpose |
|---|---|
| **Docker Desktop** | Runs PostgreSQL, Redis, Elasticsearch, Kibana, Prometheus, Grafana, the backend, and the frontend nginx container |
| **Java 21 (JDK)** | Only needed if building the backend outside Docker |
| **Maven 3.9+** | Only needed if building the backend outside Docker |
| **Node.js 24+** | Only needed if running the frontend locally (outside Docker) |

---

## Running the Project

### Step 1 — Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your values. Defaults work out-of-the-box for local dev.

> **Admin credentials:** The first admin account is seeded by `DataSeeder.java`. Default credentials are `email=admin` / `password=admin`. See `.env` for `ADMIN_EMAIL` / `ADMIN_PASSWORD` variables.

> **Observability access:** Set `ADMIN_PASSWORD` in `.env` before starting. This password protects Grafana (`:8080`) and Kibana (`:8083`) via nginx Basic Auth.

> **Email (optional):** Set `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` in `.env` (e.g. Mailtrap for dev, SendGrid for prod) to enable email notifications and password reset emails.

---

### Option A — Full Docker Stack (Recommended)

Runs everything in Docker — backend, frontend (nginx), and all infrastructure:

```bash
docker-compose up -d
```

The React app is built inside Docker and served via nginx at `http://localhost:80`.

**After backend code changes**, rebuild:
```bash
docker-compose up -d --build backend
```

**After frontend code changes**, rebuild:
```bash
docker-compose up -d --build frontend
```

---

### Option B — Docker backend + Local frontend dev

Run backend and infra in Docker, but run the frontend locally for hot-reload development:

```bash
# Step 1 — Start infra + backend
docker-compose up -d postgres redis elasticsearch kibana prometheus grafana backend

# Step 2 — Run frontend locally
cd frontend
npm install
npm run dev
```

> When running the frontend locally, set `VITE_API_URL=http://localhost:8082` in `frontend/.env` to point at the Docker-exposed backend port.

> **First Docker build:** ~2-3 min (Maven downloads dependencies). Subsequent builds are fast — the deps layer is cached and only invalidated when `pom.xml` changes.

---

### Stop Everything

```bash
docker-compose down          # Stop all containers
docker-compose down -v       # Stop + wipe volumes (fresh start)
```

---

## Service URLs

| Service | URL | Notes |
|---|---|---|
| **Frontend (Docker nginx)** | http://localhost:80 | Production-built React SPA |
| **Frontend (local dev)** | http://localhost:5173 | Vite dev server (Option B only) |
| **Backend API (Docker)** | http://localhost:8082 | Spring Boot monolith (internal port 8081, host-mapped to 8082) |
| **Backend WS** | ws://localhost:8082/ws | STOMP over SockJS |
| **Grafana** | http://localhost:8080 | Metrics dashboards — nginx proxy, Basic Auth required |
| **Kibana** | http://localhost:8083 | Log explorer — nginx proxy, Basic Auth required |
| **Prometheus** | http://localhost:9090 | Raw metrics scrape endpoint |

---

## Daily Workflow

```bash
# Full stack (all services, recommended)
docker-compose up -d

# Backend-only rebuild after Java code changes
docker-compose up -d --build backend

# Frontend-only rebuild after React code changes (Docker mode)
docker-compose up -d --build frontend

# OR: Run frontend locally for hot-reload
cd frontend && npm run dev
```

---

## Key Pages

| URL | Description |
|---|---|
| `/login`, `/register` | Auth pages (also: Google + GitHub OAuth2 buttons) |
| `/forgot-password`, `/reset-password` | Password reset flow |
| `/` | Dashboard — admin metrics view or member activity view |
| `/projects` | All your projects |
| `/projects/:id/tasks` | Kanban board with real-time updates |
| `/projects/:id/code` | Full IDE — file explorer, editor, output, preview |
| `/projects/:id/logs` | Real-time log viewer (Elasticsearch + WebSocket) |
| `/admin/users` | Admin-only user management panel |
| `/notifications` | Full notification list with tabs |
| `/profile` | Profile — avatar, stats, heatmap, notification preferences |
| `/editor` | Standalone full-screen IDE (no sidebar) |

---

## Icons & Assets

Icons used throughout the UI are sourced from [Flaticon](https://www.flaticon.com). All icons are imported as SVG assets from `frontend/src/assets/` following the `NN_name.svg` naming convention.
