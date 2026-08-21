# Backend Implementation Status

> **Architecture:** Monolithic Spring Boot Application  
> **Base URL:** `http://localhost:8081`  
> **Package root:** `com.devopssuite`  
> **Overall Status:** ✅ Complete (100%)

---

## Table of Contents
1. [Project Structure](#1-project-structure)
2. [Modules & Status](#2-modules--status)
3. [Auth Module](#3-auth-module)
4. [Project Module](#4-project-module)
5. [Code Execution Module](#5-code-execution-module)
6. [Logging Module](#6-logging-module)
7. [Metrics Module](#7-metrics-module)
8. [Notification Module](#8-notification-module)
9. [Security Layer](#9-security-layer)
10. [Database Schema](#10-database-schema)
11. [Configuration Reference](#11-configuration-reference)

---

## 1. Project Structure

```
backend/
├── pom.xml                              ← Monolithic Maven build (Java 21)
└── src/
    ├── main/
    │   ├── java/com/devopssuite/
    │   │   ├── DevOpsSuiteApplication.java
    │   │   ├── auth/
    │   │   │   ├── controller/
    │   │   │   │   ├── AuthController.java        ← register, login, logout, refresh, me, forgot/reset-password
    │   │   │   │   └── AuthExceptionHandler.java
    │   │   │   ├── dto/AuthDto.java
    │   │   │   ├── model/
    │   │   │   │   ├── User.java
    │   │   │   │   ├── Role.java
    │   │   │   │   └── PasswordResetToken.java
    │   │   │   ├── repository/
    │   │   │   │   ├── UserRepository.java
    │   │   │   │   ├── RoleRepository.java
    │   │   │   │   └── PasswordResetTokenRepository.java
    │   │   │   └── service/AuthService.java
    │   │   ├── project/
    │   │   │   ├── controller/
    │   │   │   │   ├── ProjectController.java
    │   │   │   │   ├── TaskController.java
    │   │   │   │   └── ProjectExceptionHandler.java
    │   │   │   ├── dto/ProjectDto.java
    │   │   │   ├── model/ (Project, Board, Column, Task, ProjectMember)
    │   │   │   ├── repository/ (5 repositories)
    │   │   │   └── service/ (ProjectService, TaskService)
    │   │   ├── execution/
    │   │   │   ├── config/DockerConfig.java
    │   │   │   ├── controller/ExecutionController.java
    │   │   │   ├── dto/ExecutionDto.java
    │   │   │   ├── model/ (ExecutionRequest, ExecutionResult, Language)
    │   │   │   ├── repository/ (3 repositories)
    │   │   │   ├── sandbox/DockerSandbox.java     ← Ephemeral container runner
    │   │   │   └── service/ (ExecutionService, ExecutionQueueWorker)
    │   │   ├── logging/
    │   │   │   ├── event/LogEvent.java            ← Spring Application Event record
    │   │   │   ├── filter/RequestLoggingFilter.java  ← OncePerRequestFilter → publishes LogEvent
    │   │   │   └── service/
    │   │   │       ├── ElasticsearchLogService.java  ← Indexes to ES (devopssuite-logs-yyyy.MM.dd)
    │   │   │       └── LogStreamingService.java      ← Broadcasts via WebSocket /topic/logs/{projectId}
    │   │   ├── notification/
    │   │   │   ├── controller/NotificationController.java ← Full REST inbox CRUD
    │   │   │   ├── dto/NotificationDto.java
    │   │   │   ├── event/
    │   │   │   │   ├── TaskAssignedEvent.java
    │   │   │   │   ├── MemberAddedEvent.java
    │   │   │   │   └── NotificationEventListener.java ← Persists + WS pushes
    │   │   │   ├── model/Notification.java
    │   │   │   ├── repository/NotificationRepository.java
    │   │   │   └── service/NotificationService.java
    │   │   ├── security/
    │   │   │   ├── SecurityConfig.java
    │   │   │   ├── JwtRequestFilter.java
    │   │   │   └── JwtUtils.java
    │   │   └── config/
    │   │       ├── WebSocketConfig.java      ← STOMP/SockJS broker
    │   │       └── ElasticsearchConfig.java  ← ES client bean
    │   └── resources/
    │       ├── application.yml
    │       └── db/migration/V1__initial_schema.sql
    └── test/
        └── java/com/devopssuite/
            ├── project/controller/TaskControllerTest.java
            ├── project/service/ProjectServiceTest.java
            └── project/service/TaskServiceTest.java
```

---

## 2. Modules & Status

| Module | Status | What's Done |
|---|---|---|
| `auth` | ✅ **Complete** | Registration, login, JWT generation/refresh, logout (Redis blacklist), profile fetch, forgot/reset password, BCrypt cost-12 |
| `project` | ✅ **Complete** | Projects CRUD, Boards, Columns, Tasks, Members (RBAC), Task reordering, auto-creates default board on project creation |
| `execution` | ✅ **Complete** | Docker sandbox (no-network, 1CPU/256MB cap, 30s timeout), async queue worker, Python/JS/Java/C++ support, stdin piping, result persistence |
| `logging` | ✅ **Complete** | `RequestLoggingFilter` publishes `LogEvent`; `ElasticsearchLogService` indexes to ES; `LogStreamingService` streams via WebSocket |
| `notification` | ✅ **Complete** | Spring Events (TaskAssigned, MemberAdded) → persist + WebSocket push to `/topic/notifications/{userId}`; full REST inbox CRUD |
| `metrics` | ✅ **Complete** | Spring Actuator + Micrometer/Prometheus endpoints; Prometheus scrapes; Grafana dashboards configured |
| `security` | ✅ **Complete** | JWT filter, CORS, Redis-backed token blacklist, OAuth2 skeleton wired |

---

## 3. Auth Module

**Package:** `com.devopssuite.auth`  
**Base path:** `/auth` or `/api/auth`  
**Status:** ✅ Complete

### Entities
| Class | Table | Description |
|---|---|---|
| `User` | `users` | Email, BCrypt-hashed password, display name, roles |
| `Role` | `roles` | `ROLE_USER`, `ROLE_ADMIN` |
| `PasswordResetToken` | `password_reset_tokens` | Short-lived token for forgot-password flow |

### Endpoints
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Create new user account |
| `POST` | `/auth/login` | ❌ | Login — returns access + refresh tokens |
| `POST` | `/auth/refresh` | ❌ | Exchange refresh token for new access token |
| `POST` | `/auth/logout` | ✅ | Blacklist both tokens in Redis |
| `GET` | `/auth/me` | ✅ | Fetch currently authenticated user profile |
| `POST` | `/auth/forgot-password` | ❌ | Request password reset link (email) |
| `POST` | `/auth/reset-password` | ❌ | Reset password with token |

### Key DTOs
```
SignupRequest         → { email, password, display_name }
LoginRequest          → { email, password }
LoginResponse         → { access_token, refresh_token, expires_in, token_type, user }
RefreshRequest        → { refresh_token }
RefreshResponse       → { access_token, expires_in }
LogoutRequest         → { refresh_token }
ForgotPasswordRequest → { email }
ResetPasswordRequest  → { token, new_password }
UserResponse          → { user_id, email, display_name, roles, created_at }
```

---

## 4. Project Module

**Package:** `com.devopssuite.project`  
**Base paths:** `/api/v1/projects` and `/api/v1/tasks`  
**Status:** ✅ Complete

### Entities
| Class | Table | Description |
|---|---|---|
| `Project` | `projects` | Top-level project owned by a user |
| `ProjectMember` | `project_members` | Users with RBAC roles assigned to a project |
| `Board` | `boards` | A Kanban board inside a project |
| `Column` | `board_columns` | A status column in a board |
| `Task` | `tasks` | A work item belonging to a column and board |

### Project Endpoints
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/projects` | ✅ | Create project (auto-creates default board + 4 columns) |
| `GET` | `/api/v1/projects` | ✅ | List your projects (paginated) |
| `GET` | `/api/v1/projects/{id}` | ✅ | Get single project |
| `PUT` | `/api/v1/projects/{id}` | ✅ | Update project |
| `DELETE` | `/api/v1/projects/{id}` | ✅ | Delete project |
| `POST` | `/api/v1/projects/{id}/members` | ✅ | Add or update a project member |
| `DELETE` | `/api/v1/projects/{id}/members/{userId}` | ✅ | Remove a project member |
| `GET` | `/api/v1/projects/{id}/boards` | ✅ | List boards in a project |
| `POST` | `/api/v1/projects/{id}/boards` | ✅ | Create a board |
| `POST` | `/api/v1/projects/{id}/boards/{boardId}/columns` | ✅ | Create a column |
| `PUT` | `/api/v1/projects/{id}/boards/{boardId}/columns/{columnId}` | ✅ | Update a column |
| `DELETE` | `/api/v1/projects/{id}/boards/{boardId}/columns/{columnId}` | ✅ | Delete a column |
| `GET` | `/api/v1/projects/{id}/tasks` | ✅ | List all tasks in a project |
| `PUT` | `/api/v1/projects/{id}/boards/{boardId}/tasks/reorder` | ✅ | Reorder/move tasks across columns |

### Task Endpoints
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/tasks` | ✅ | Create a task (general) |
| `POST` | `/api/v1/boards/{boardId}/tasks` | ✅ | Create a task in a board |
| `GET` | `/api/v1/tasks/{id}` | ✅ | Get a single task |
| `PUT` | `/api/v1/tasks/{id}` | ✅ | Update a task |
| `PATCH` | `/api/v1/tasks/{id}/status` | ✅ | Update task status only |
| `DELETE` | `/api/v1/tasks/{id}` | ✅ | Delete a task |

### Key DTOs
```
ProjectRequest     → { name, description }
BoardRequest       → { name }
ColumnRequest      → { name, wip_limit }
TaskRequest        → { title, description, column_id, assignee_id, due_date, priority, labels }
TaskStatusRequest  → { status }
MemberRequest      → { user_id, role }
```

---

## 5. Code Execution Module

**Package:** `com.devopssuite.execution`  
**Base paths:** `/api/v1/execute`  
**Status:** ✅ Complete (requires Docker Desktop running)

### How It Works
1. Client `POST /api/v1/execute` with code and language.
2. `ExecutionRequest` is saved with status `QUEUED`.
3. `ExecutionQueueWorker` picks it up asynchronously.
4. `DockerSandbox` spawns ephemeral container (no-network, 1CPU, 256MB, 30s timeout), captures stdout/stderr.
5. `ExecutionResult` persisted to DB.
6. Client polls `GET /api/v1/execute/{id}` until status is terminal.

### Endpoints
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/execute` | ✅ | Submit code for execution |
| `GET` | `/api/v1/execute/{id}` | ✅ | Poll for execution result |

### Supported Languages
| Language key | Runtime | Notes |
|---|---|---|
| `python` / `python3` | `python:3.12-slim` | Direct execution |
| `javascript` / `node` | `node:24-slim` | Direct execution |
| `java` | `openjdk:21-slim` | Compiles then runs |
| `cpp` / `c++` | `gcc:13-slim` | g++ compiles then runs |

### Status Values
| Status | Meaning |
|---|---|
| `QUEUED` | Waiting in queue |
| `RUNNING` | Container executing |
| `COMPLETED` | Finished successfully |
| `FAILED` | Runtime error |
| `TIMEOUT` | Exceeded `max_time_ms` |
| `OOM_KILLED` | Exceeded memory limit |

### Key DTOs
```
SubmitRequest   → { language, source_code, stdin?, max_time_ms?, max_memory_mb? }
SubmitResponse  → { execution_id, status }
QueryResponse   → { execution_id, status, stdout, stderr, exit_code, execution_time_ms, memory_used_kb, timed_out, oom_killed }
```

---

## 6. Logging Module

**Package:** `com.devopssuite.logging`  
**Status:** ✅ Complete

### How It Works
- **`RequestLoggingFilter`** (`OncePerRequestFilter`) intercepts every HTTP request, measures duration, extracts `userId` from `SecurityContext` and `projectId` from the URI path, then publishes a `LogEvent` (Spring Application Event).
- **`ElasticsearchLogService`** (`@EventListener @Async`) indexes each `LogEvent` as a JSON document into Elasticsearch under the daily index `devopssuite-logs-yyyy.MM.dd`.
- **`LogStreamingService`** (`@EventListener @Async`) broadcasts project-scoped events over WebSocket to `/topic/logs/{projectId}` for real-time display in the frontend LogsPage.

### `LogEvent` Fields
```
method     → HTTP method (GET, POST, etc.)
uri        → Request path
status     → HTTP response status code
durationMs → Total request duration in ms
userId     → Authenticated user ID (null for anonymous)
projectId  → UUID parsed from URI (null if not project-scoped)
timestamp  → Instant of request completion
```

### WebSocket Topic
- `/topic/logs/{projectId}` — Real-time request log stream for a project

---

## 7. Metrics Module

**Package:** `com.devopssuite.metrics`  
**Status:** ✅ Complete (via Spring Actuator + Micrometer)

### Active Endpoints
| Endpoint | URL |
|---|---|
| Health check | `GET http://localhost:8081/actuator/health` |
| App info | `GET http://localhost:8081/actuator/info` |
| All metrics | `GET http://localhost:8081/actuator/metrics` |
| Prometheus scrape | `GET http://localhost:8081/actuator/prometheus` |
| Specific metric | `GET http://localhost:8081/actuator/metrics/{name}` |

### Infrastructure
- **Prometheus** (port `9090`) scrapes `/actuator/prometheus` every 15s
- **Grafana** (port `3000`) has pre-configured JVM + HTTP request dashboards

---

## 8. Notification Module

**Package:** `com.devopssuite.notification`  
**Status:** ✅ Complete

### How It Works
1. `ProjectService`/`TaskService` publish Spring events (`TaskAssignedEvent`, `MemberAddedEvent`) via `ApplicationEventPublisher`.
2. `NotificationEventListener` (`@EventListener @Async`) persists a `Notification` to DB and pushes a real-time payload to `/topic/notifications/{userId}` via `SimpMessagingTemplate`.
3. `NotificationController` exposes a full REST inbox API.

### REST Endpoints
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | ✅ | Paginated inbox (`?page=0&size=20`) |
| `GET` | `/api/notifications/unread-count` | ✅ | Count of unread notifications |
| `PUT` | `/api/notifications/{id}/read` | ✅ | Mark single notification as read |
| `PUT` | `/api/notifications/read-all` | ✅ | Mark all notifications as read |
| `DELETE` | `/api/notifications/{id}` | ✅ | Delete a notification |

### WebSocket Topic
- `/topic/notifications/{userId}` — Real-time push of new notifications

### Spring Events
| Event | Trigger |
|---|---|
| `TaskAssignedEvent` | When a task is assigned to a user |
| `MemberAddedEvent` | When a user is added to a project |

---

## 9. Security Layer

**Package:** `com.devopssuite.security`

| Class | Purpose |
|---|---|
| `SecurityConfig` | HTTP security chain, CORS, public/protected routes, OAuth2 skeleton |
| `JwtRequestFilter` | Validates `Authorization: Bearer <token>`, checks Redis blacklist, sets `SecurityContext` |
| `JwtUtils` | Issues and validates JWTs; signs with `JWT_SECRET` from environment |

### Token Configuration
| Token | TTL | Notes |
|---|---|---|
| Access token | 1 hour (3,600,000 ms) | Client-side localStorage |
| Refresh token | 7 days (604,800,000 ms) | Client-side localStorage |
| Blacklisted tokens | Remaining TTL | Stored in Redis on logout |

### Public Routes (no token required)
```
POST  /auth/register
POST  /auth/login
POST  /api/auth/register
POST  /api/auth/login
POST  /auth/forgot-password
POST  /auth/reset-password
GET   /actuator/**
      /oauth2/**
      /login/oauth2/**
      /ws/**        ← WebSocket handshake
```

### RBAC Roles (enforced in service layer)
`OWNER > ADMIN > MEMBER > VIEWER`

---

## 10. Database Schema

Managed by **Flyway** — `src/main/resources/db/migration/V1__initial_schema.sql`

| Table | Description |
|---|---|
| `users` | User accounts |
| `roles` | Role definitions |
| `user_roles` | Many-to-many join |
| `password_reset_tokens` | Forgot-password short-lived tokens |
| `projects` | Projects |
| `project_members` | Project RBAC assignments |
| `boards` | Kanban boards |
| `board_columns` | Status columns |
| `tasks` | Work items |
| `execution_requests` | Code submission records |
| `execution_results` | Docker sandbox results |
| `languages` | Supported language registry |
| `notifications` | In-app notification records |

---

## 11. Configuration Reference

File: `backend/src/main/resources/application.yml`

| Property | Default | Description |
|---|---|---|
| `server.port` | `8081` | HTTP port |
| `spring.datasource.url` | `jdbc:postgresql://postgres:5432/devopssuite` | PostgreSQL (Docker service name) |
| `spring.datasource.password` | — | Set via `DB_PASSWORD` env var |
| `spring.data.redis.host` | `redis` | Redis host (Docker service name) |
| `spring.data.redis.port` | `6379` | Redis port |
| `jwt.secret` | — | Set via `JWT_SECRET` env var (256+ bits) |
| `jwt.expiration` | `3600000` | Access token TTL (1h) |
| `jwt.refresh-expiration` | `604800000` | Refresh token TTL (7 days) |
| `spring.elasticsearch.uris` | `http://elasticsearch:9200` | Elasticsearch URL |
| `docker.pool-size` | `10` | Max concurrent sandbox containers |
| `docker.timeout` | `30000` | Sandbox execution timeout (ms) |
| `GOOGLE_CLIENT_ID` | *(env var)* | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | *(env var)* | Google OAuth2 client secret |

> **Never hardcode secrets.** All sensitive values go in `.env` (see `.env.example`).
