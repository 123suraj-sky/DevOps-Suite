# ARCHITECTURE.md — DevOps Suite Architecture Reference

> **Quick architecture reference for AI agents.**
> For deeper design details, refer to the full documentation in `docs/`.

---

## 🗺️ System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│               React 18 SPA  (Port 5173)                     │
│  Vite · React Router · Axios · Monaco · SockJS/STOMP        │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST: /api/**   WS: /ws
┌──────────────────────────▼──────────────────────────────────┐
│         Spring Boot Monolith  (Port 8081)                   │
│                                                             │
│  ┌──────────┐  ┌─────────┐  ┌───────────┐  ┌────────────┐ │
│  │   Auth   │  │ Project │  │ Execution │  │  Logging   │ │
│  │  Module  │  │ Module  │  │  Module   │  │  Module    │ │
│  └──────────┘  └─────────┘  └─────┬─────┘  └────────────┘ │
│  ┌──────────┐  ┌─────────┐        │        ┌────────────┐  │
│  │ Metrics  │  │Notif.   │        │        │  Security  │  │
│  │ Module   │  │ Module  │        │        │   Filter   │  │
│  └──────────┘  └─────────┘        │        └────────────┘  │
└───────┬──────────┬─────────────────┼────────────────────────┘
        │          │                 │
   ┌────▼───┐ ┌────▼────┐    ┌──────▼──────┐
   │Postgres│ │  Redis  │    │Docker Engine│
   │  DB    │ │  Cache  │    │  Sandbox    │
   └────────┘ └─────────┘    └─────────────┘
        │
   ┌────▼──────────┐
   │ Elasticsearch │──► Kibana (5601)
   └───────────────┘
        │
   ┌────▼──────┐
   │ Prometheus│──► Grafana (3000)
   └───────────┘
```

---

## 📦 Backend Package Structure

Base package: `com.devopssuite.monolith`

| Package | Responsibility |
|---|---|
| `.security` | `JwtRequestFilter`, Spring Security config, JWT utility |
| `.auth` | `AuthController`, `AuthService`, `UserRepository`, `User` entity |
| `.project` | `ProjectController`, `TaskController`, `ProjectService`, `TaskService`, board/column/task entities |
| `.execution` | `ExecutionController`, `DockerSandbox`, language runners |
| `.logging` | Request/response logging, Elasticsearch write pipeline |
| `.metrics` | Actuator integration, Prometheus metrics handlers |
| `.notification` | `NotificationEventListener`, WebSocket dispatch via Spring Events |
| `.config` | `WebSocketConfig`, `SecurityConfig`, `RedisConfig`, `CorsConfig` |

---

## 🔐 Security Flow

```
Every HTTP Request
       │
       ▼
JwtRequestFilter (Intercepts all requests)
       │
       ├── Authorization header present?
       │       YES → Validate JWT signature & expiry
       │                │
       │                ├── Valid → Set SecurityContext principal → Continue
       │                └── Invalid → Continue (controller will get 401)
       │
       └── No header → Continue (public routes pass; protected routes get 401)
```

**JWT Lifecycle:**
- Access token: **1 hour** TTL
- Refresh token: **7 days** TTL
- Revocation: Token hash stored in Redis (`jwt:blacklist:{token}`)

**RBAC roles (descending):** `OWNER → ADMIN → MEMBER → VIEWER`

---

## 🐳 Code Execution Sandbox Flow

```
POST /api/execution/run
       │
       ▼
Validate (language whitelist, payload size)
       │
       ▼
Write code to ephemeral temp file
       │
       ▼
docker run --network=none --read-only --memory=256m --cpus=1 --timeout=30s
       │
       ▼
Capture stdout / stderr / exit code
       │
       ▼
Destroy container → Return result DTO
```

Supported languages: **Java, Python, JavaScript** (extensible via language registry)

---

## 🔄 Async Event Pipeline (Internal Spring Events)

```
Service Layer (e.g., AuthService, TaskService)
       │
       ▼
ApplicationEventPublisher.publishEvent(...)
       │
       ▼
@EventListener (async) in NotificationEventListener
       │
       ▼
SimpMessagingTemplate → WebSocket topic broadcast
```

**No Kafka** — all event processing is in-JVM via Spring Events.

---

## 📡 WebSocket Topics

| Topic | Purpose |
|---|---|
| `/topic/notifications/{userId}` | In-app toast notifications (task assigned, errors) |
| `/topic/logs/{projectId}` | Real-time log streaming |
| `/topic/tasks/{projectId}` | Live Kanban board updates |

**Protocol:** STOMP over SockJS  
**Auth:** JWT passed as query param during STOMP CONNECT handshake

---

## 🗄️ Data Layer

### PostgreSQL — `devopssuite` database
- Schema managed by **Flyway** migrations (`backend/src/main/resources/db/migration/`)
- Single DB, all domain tables in one schema
- JPA entities with Hibernate

### Redis — Key Patterns
| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `user:{userId}` | Hash | 30 min | User profile cache |
| `jwt:blacklist:{token}` | String | Token TTL | Revoked JWT tokens |
| `project:{projectId}` | Hash | 15 min | Project metadata cache |
| `rate:api:{userId}:{endpoint}` | String | 1 min | Rate limiting counter |

**Cache strategy:** Cache-aside (read from cache → miss → read DB → populate cache)

---

## 🏗️ Frontend Architecture

```
frontend/src/
├── api/              # Axios service clients (authApi.js, projectApi.js, etc.)
├── components/
│   ├── layout/       # Header, Sidebar, MainLayout
│   └── ui/           # Reusable UI components
├── context/
│   ├── AuthContext       # JWT state, login/logout
│   ├── NotificationContext
│   └── WebSocketContext  # STOMP connection lifecycle
└── pages/            # Login, Register, Projects, Kanban, CodeEditor, Logs, Metrics
```

- **API base URL:** `http://localhost:8081/api` (from `VITE_API_URL`)
- **WS URL:** `ws://localhost:8081/ws` (from `VITE_WS_URL`)
- **Auth:** Axios interceptors attach `Authorization: Bearer <token>` to all requests
- **Protected routes:** `ProtectedRoute` wrapper redirects unauthenticated users to `/login`

---

## 📊 Observability Stack

| Tool | URL | What it shows |
|---|---|---|
| Spring Actuator | `/actuator/health`, `/actuator/metrics` | App health + JVM metrics |
| Prometheus | http://localhost:9090 | Raw metrics scrape from `/actuator/prometheus` |
| Grafana | http://localhost:3000 | Dashboards over Prometheus data |
| Elasticsearch | internal:9200 | Indexed structured logs |
| Kibana | http://localhost:5601 | Log search and exploration |
