# Backend Implementation Status

> **Architecture:** Monolithic Spring Boot Application  
> **Base URL:** `http://localhost:8081`  
> **Package root:** `com.devopssuite.monolith`

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
├── pom.xml                              ← Monolithic Maven build
└── src/
    ├── main/
    │   ├── java/com/devopssuite/monolith/
    │   │   ├── DevOpsSuiteApplication.java    ← Spring Boot entry point
    │   │   ├── auth/
    │   │   │   ├── controller/AuthController.java
    │   │   │   ├── dto/AuthDto.java
    │   │   │   ├── model/User.java, Role.java
    │   │   │   ├── repository/UserRepository.java, RoleRepository.java
    │   │   │   └── service/AuthService.java
    │   │   ├── project/
    │   │   │   ├── controller/ProjectController.java, TaskController.java
    │   │   │   ├── dto/ProjectDto.java
    │   │   │   ├── model/Project.java, Board.java, Column.java, Task.java, ProjectMember.java
    │   │   │   ├── repository/ (5 repositories)
    │   │   │   └── service/ProjectService.java, TaskService.java
    │   │   ├── execution/
    │   │   │   ├── controller/ExecutionController.java
    │   │   │   ├── dto/ExecutionDto.java
    │   │   │   ├── model/ExecutionRequest.java, ExecutionResult.java, Language.java
    │   │   │   ├── repository/ (3 repositories)
    │   │   │   ├── sandbox/DockerSandbox.java
    │   │   │   └── service/ExecutionService.java, ExecutionQueueWorker.java
    │   │   ├── logging/   ← Scaffold (structure only)
    │   │   ├── metrics/   ← Scaffold (structure only)
    │   │   ├── notification/ ← Scaffold (structure only)
    │   │   └── security/
    │   │       ├── SecurityConfig.java
    │   │       ├── JwtRequestFilter.java
    │   │       └── JwtUtils.java
    │   └── resources/
    │       ├── application.yml
    │       └── db/migration/V1__initial_schema.sql
    └── test/
        └── java/com/devopssuite/monolith/
            ├── project/controller/TaskControllerTest.java
            ├── project/service/ProjectServiceTest.java
            └── project/service/TaskServiceTest.java
```

---

## 2. Modules & Status

| Module | Status | What's Done |
|---|---|---|
| `auth` | ✅ **Complete** | Registration, login, JWT generation, profile fetch, Spring Security integration |
| `project` | ✅ **Complete** | Projects CRUD, Boards, Columns, Tasks CRUD, Members, Task reordering |
| `execution` | ⚙️ **Implemented** | Docker sandbox, async queue worker, language model, result persistence |
| `security` | ✅ **Complete** | Central JWT filter, CORS config, security chain, OAuth2 skeleton |
| `logging` | 🔧 **Scaffold** | Package structure exists; no business logic yet |
| `metrics` | 🔧 **Scaffold** | Package structure exists; Actuator/Prometheus endpoints configured via `application.yml` |
| `notification` | 🔧 **Scaffold** | Package structure exists; Spring Events wiring planned |

---

## 3. Auth Module

**Package:** `com.devopssuite.monolith.auth`  
**Base path:** `/auth` or `/api/auth`  
**Status:** ✅ Complete

### Entities
| Class | Table | Description |
|---|---|---|
| `User` | `users` | Core user entity with email, hashed password, display name, roles |
| `Role` | `roles` | ROLE_USER, ROLE_ADMIN enum values |

### Endpoints
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Create new user account |
| `POST` | `/auth/login` | ❌ | Login and receive JWT tokens |
| `GET` | `/auth/me` | ✅ | Fetch currently authenticated user's profile |

### Key DTOs
```
SignupRequest   → { email, password, display_name }
LoginRequest    → { email, password }
LoginResponse   → { access_token, refresh_token, expires_in, token_type, user }
UserResponse    → { user_id, email, display_name, roles, created_at }
```

---

## 4. Project Module

**Package:** `com.devopssuite.monolith.project`  
**Base paths:** `/projects` or `/api/v1/projects` and `/tasks` or `/api/v1/tasks`  
**Status:** ✅ Complete

### Entities
| Class | Table | Description |
|---|---|---|
| `Project` | `projects` | Top-level project owned by a user |
| `ProjectMember` | `project_members` | Users with roles (OWNER, ADMIN, MEMBER, VIEWER) assigned to a project |
| `Board` | `boards` | A Kanban board inside a project |
| `Column` | `board_columns` | A status column in a board (e.g. TODO, IN_PROGRESS, DONE) |
| `Task` | `tasks` | A work item belonging to a column and board |

### Project Endpoints
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/projects` | ✅ | Create project |
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
| `PUT` | `/api/v1/projects/{id}/boards/{boardId}/tasks/reorder` | ✅ | Reorder tasks across columns |

### Task Endpoints
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/tasks` | ✅ | Create a task (general) |
| `POST` | `/api/v1/boards/{boardId}/tasks` | ✅ | Create a task inside a specific board |
| `GET` | `/api/v1/tasks/{id}` | ✅ | Get a single task |
| `PUT` | `/api/v1/tasks/{id}` | ✅ | Update a task |
| `PATCH` | `/api/v1/tasks/{id}/status` | ✅ | Update only the task status |
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

**Package:** `com.devopssuite.monolith.execution`  
**Base paths:** `/api/v1/execute` or `/execute`  
**Status:** ⚙️ Implemented (requires Docker to be running)

### How It Works
1. Client `POST /api/v1/execute` with code and language.
2. An `ExecutionRequest` record is saved to DB with status `QUEUED`.
3. `ExecutionQueueWorker` picks up the request asynchronously.
4. `DockerSandbox` spins up an ephemeral container, runs the code, captures stdout/stderr.
5. Result is saved to `execution_results` table.
6. Client polls `GET /api/v1/execute/{id}` to retrieve the result.

### Endpoints
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/execute` | ✅ | Submit code for execution |
| `GET` | `/api/v1/execute/{id}` | ✅ | Poll for execution result |

### Key DTOs
```
SubmitRequest   → { language, source_code, stdin?, max_time_ms?, max_memory_mb? }
SubmitResponse  → { execution_id, status }
QueryResponse   → { execution_id, status, stdout, stderr, exit_code, execution_time_ms, memory_used_kb, timed_out, oom_killed }
```

### Supported Languages
- `python` / `python3`
- `javascript` / `node`

---

## 6. Logging Module

**Package:** `com.devopssuite.monolith.logging`  
**Status:** 🔧 Scaffold — Package structure exists, no controllers yet.  

**Planned:** Structured log ingestion, forwarding to Elasticsearch via Logstash pipeline.

---

## 7. Metrics Module

**Package:** `com.devopssuite.monolith.metrics`  
**Status:** 🔧 Scaffold — Package structure exists.

**Already active via Actuator:**

| Endpoint | URL |
|---|---|
| Health check | `GET http://localhost:8081/actuator/health` |
| Info | `GET http://localhost:8081/actuator/info` |
| Prometheus metrics | `GET http://localhost:8081/actuator/prometheus` |
| All metrics | `GET http://localhost:8081/actuator/metrics` |

---

## 8. Notification Module

**Package:** `com.devopssuite.monolith.notification`  
**Status:** 🔧 Scaffold — Package structure exists.  

**Planned:** Spring Application Events (`UserRegisteredEvent`, `TaskUpdateEvent`) consumed asynchronously to trigger in-app notifications or emails.

---

## 9. Security Layer

**Package:** `com.devopssuite.monolith.security`

| Class | Purpose |
|---|---|
| `SecurityConfig` | Defines HTTP security chain, CORS, public/protected routes |
| `JwtRequestFilter` | Intercepts all requests, validates `Authorization: Bearer <token>`, sets `SecurityContext` |
| `JwtUtils` | Issues and validates JWTs; uses `jwt.secret` from `application.yml` |

### Public Routes (no token required)
```
POST /auth/register
POST /auth/login
POST /api/auth/register
POST /api/auth/login
GET  /actuator/**
/oauth2/**
/login/oauth2/**
```

All other routes require a valid `Authorization: Bearer <token>` header.

---

## 10. Database Schema

Managed by **Flyway** — migration file at `src/main/resources/db/migration/V1__initial_schema.sql`.

| Table | Description |
|---|---|
| `users` | User accounts |
| `roles` | Role definitions |
| `user_roles` | Many-to-many join table |
| `projects` | Projects owned by users |
| `project_members` | Users assigned to projects with roles |
| `boards` | Kanban boards inside projects |
| `board_columns` | Columns in a board (status stages) |
| `tasks` | Individual work items |
| `execution_requests` | Submitted code execution requests |
| `execution_results` | Results from the Docker sandbox |
| `languages` | Supported programming languages registry |
| `notifications` | Internal notification records |

---

## 11. Configuration Reference

File: `backend/src/main/resources/application.yml`

| Property | Default | Description |
|---|---|---|
| `server.port` | `8081` | HTTP port |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/devopssuite` | PostgreSQL URL |
| `spring.datasource.password` | `password` | Set via `DB_PASSWORD` env var |
| `spring.data.redis.host` | `localhost` | Redis host |
| `spring.data.redis.port` | `6379` | Redis port |
| `jwt.secret` | *(placeholder)* | Set via `JWT_SECRET` env var — must be 256+ bits |
| `jwt.expiration` | `86400000` | Access token TTL (24h in ms) |
| `jwt.refresh-expiration` | `604800000` | Refresh token TTL (7 days in ms) |
| `docker.pool-size` | `10` | Max concurrent sandbox containers |
| `docker.timeout` | `300000` | Container execution timeout (ms) |
| `GOOGLE_CLIENT_ID` | *(env var)* | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | *(env var)* | Google OAuth2 client secret |
