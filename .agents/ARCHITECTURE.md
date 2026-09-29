# ARCHITECTURE.md â€” DevOps Suite Architecture Reference

> **Quick architecture reference for AI agents.**
> For deeper design details, refer to the full documentation in `docs/`.

---

## ðŸ—ºï¸ System Overview

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                        User Browser                         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â”‚ HTTP / WebSocket
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚               React 18 SPA  (Port 5173)                     â”‚
â”‚  Vite Â· React Router Â· Axios Â· Monaco Â· SockJS/STOMP        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â”‚ REST: /api/**   WS: /ws
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚         Spring Boot Monolith  (Port 8082 host / 8081 internal)                   â”‚
â”‚                                                             â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚   Auth   â”‚  â”‚ Project â”‚  â”‚ Execution â”‚  â”‚  Logging   â”‚ â”‚
â”‚  â”‚  Module  â”‚  â”‚ Module  â”‚  â”‚  Module   â”‚  â”‚  Module    â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”        â”‚        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚ Metrics  â”‚  â”‚Notif.   â”‚        â”‚        â”‚  Security  â”‚  â”‚
â”‚  â”‚ Module   â”‚  â”‚ Module  â”‚        â”‚        â”‚   Filter   â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜        â”‚        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚          â”‚                 â”‚
   â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â” â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
   â”‚Postgresâ”‚ â”‚  Redis  â”‚    â”‚Docker Engineâ”‚
   â”‚  DB    â”‚ â”‚  Cache  â”‚    â”‚  Sandbox    â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚
   â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚ Elasticsearch â”‚â”€â”€â–º Kibana (:8083 via nginx)
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚
   â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
   â”‚ Prometheusâ”‚â”€â”€â–º Grafana (:8080 via nginx)
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸ“¦ Backend Package Structure

Base package: `com.devopssuite`

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

## ðŸ” Security Flow

```
Every HTTP Request
       â”‚
       â–¼
JwtRequestFilter (Intercepts all requests)
       â”‚
       â”œâ”€â”€ Authorization header present?
       â”‚       YES â†’ Validate JWT signature & expiry
       â”‚                â”‚
       â”‚                â”œâ”€â”€ Valid â†’ Set SecurityContext principal â†’ Continue
       â”‚                â””â”€â”€ Invalid â†’ Continue (controller will get 401)
       â”‚
       â””â”€â”€ No header â†’ Continue (public routes pass; protected routes get 401)
```

**JWT Lifecycle:**
- Access token: **1 hour** TTL
- Refresh token: **7 days** TTL
- Revocation: Token hash stored in Redis (`jwt:blacklist:{token}`)

**RBAC roles (descending):** `OWNER â†’ ADMIN â†’ MEMBER â†’ VIEWER`

---

## ðŸ³ Code Execution Sandbox Flow

```
POST /api/code-execution/run
       â”‚
       â–¼
Validate (language whitelist, payload size)
       â”‚
       â–¼
Write code to ephemeral temp file
       â”‚
       â–¼
docker run --network=none --read-only --memory=256m --cpus=1 --timeout=30s
       â”‚
       â–¼
Capture stdout / stderr / exit code
       â”‚
       â–¼
Destroy container â†’ Return result DTO
```

Supported languages: **Java, Python, JavaScript, C++** (extensible via language registry)

---

## ðŸ”„ Async Event Pipeline (Internal Spring Events)

```
Service Layer (e.g., AuthService, TaskService)
       â”‚
       â–¼
ApplicationEventPublisher.publishEvent(...)
       â”‚
       â–¼
@EventListener (async) in NotificationEventListener
       â”‚
       â–¼
SimpMessagingTemplate â†’ WebSocket topic broadcast
```

**No Kafka** â€” all event processing is in-JVM via Spring Events.

---

## ðŸ“¡ WebSocket Topics

| Topic | Purpose |
|---|---|
| `/topic/notifications/{userId}` | In-app toast notifications (task assigned, errors) |
| `/topic/logs/{projectId}` | Real-time log streaming |
| `/topic/tasks/{projectId}` | Live Kanban board updates |

**Protocol:** STOMP over SockJS  
**Auth:** JWT passed as query param during STOMP CONNECT handshake

---

## ðŸ—„ï¸ Data Layer

### PostgreSQL â€” `devopssuite` database
- Schema managed by **Flyway** migrations (`backend/src/main/resources/db/migration/`)
- Single DB, all domain tables in one schema
- JPA entities with Hibernate

### Redis â€” Key Patterns
| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `user:{userId}` | Hash | 30 min | User profile cache |
| `jwt:blacklist:{token}` | String | Token TTL | Revoked JWT tokens |
| `project:{projectId}` | Hash | 15 min | Project metadata cache |
| `rate:api:{userId}:{endpoint}` | String | 1 min | Rate limiting counter |

**Cache strategy:** Cache-aside (read from cache â†’ miss â†’ read DB â†’ populate cache)

---

## ðŸ—ï¸ Frontend Architecture

```
frontend/src/
â”œâ”€â”€ api/              # Axios service clients (authApi.js, projectApi.js, etc.)
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ layout/       # Header, Sidebar, MainLayout
â”‚   â””â”€â”€ ui/           # Reusable UI components
â”œâ”€â”€ context/
â”‚   â”œâ”€â”€ AuthContext       # JWT state, login/logout
â”‚   â”œâ”€â”€ NotificationContext
â”‚   â””â”€â”€ WebSocketContext  # STOMP connection lifecycle
â””â”€â”€ pages/            # Login, Register, Projects, Kanban, CodeEditor, Logs, Metrics
```

- **API base URL:** `http://localhost:8082 (Docker) or http://localhost:8081 (local dev)` (from `VITE_API_URL`)
- **WS URL:** `ws://localhost:8082/ws (Docker) or ws://localhost:8081/ws (local dev)` (from `VITE_WS_URL`)
- **Auth:** Axios interceptors attach `Authorization: Bearer <token>` to all requests
- **Protected routes:** `ProtectedRoute` wrapper redirects unauthenticated users to `/login`

---

## ðŸ“Š Observability Stack

| Tool | URL | What it shows |
|---|---|---|
| Spring Actuator | `/actuator/health`, `/actuator/metrics` | App health + JVM metrics |
| Prometheus | http://localhost:9090 | Raw metrics scrape from `/actuator/prometheus` |
| Grafana | http://localhost:8080 (nginx proxy) | Dashboards over Prometheus data |
| Elasticsearch | internal:9200 | Indexed structured logs |
| Kibana | http://localhost:8083 (nginx proxy) | Log search and exploration |
