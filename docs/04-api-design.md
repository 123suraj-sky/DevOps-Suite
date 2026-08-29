# API Design & Contracts — DevOps Suite

> **Base URL:** `http://localhost:8081`  
> **Auth:** All protected endpoints require `Authorization: Bearer <access_token>` header.  
> **Error format:** `{ "status": "error", "message": "...", "timestamp": "..." }`

---

## Table of Contents
1. [Auth API](#1-auth-api)
2. [Project API](#2-project-api)
3. [Task API](#3-task-api)
4. [Code Execution API](#4-code-execution-api)
5. [Notification API](#5-notification-api)
6. [Actuator / Metrics API](#6-actuator--metrics-api)
7. [WebSocket STOMP Topics](#7-websocket-stomp-topics)
8. [Common Error Responses](#8-common-error-responses)

---

## 1. Auth API

Base path: `/auth` or `/api/auth`  
All endpoints below work with **both** prefixes.

---

### POST `/auth/register`
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "display_name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "created_at": "2026-08-22T00:00:00Z"
  }
}
```

---

### POST `/auth/login`
Login and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiJ9...",
    "expires_in": 3600000,
    "token_type": "Bearer"
  }
}
```

---

### POST `/auth/refresh`
Exchange a refresh token for a new access token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiJ9...",
    "expires_in": 3600000
  }
}
```

---

### POST `/auth/logout`  🔒
Blacklist both tokens in Redis immediately.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

### GET `/auth/me`  🔒
Get the authenticated user's profile.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "roles": ["ROLE_USER"],
    "created_at": "2026-08-22T00:00:00Z"
  }
}
```

---

### POST `/auth/forgot-password`
Request a password reset link (sent via email).

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Password reset link sent to your email."
}
```

---

### POST `/auth/reset-password`
Reset password using the token from the email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "new_password": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Password has been reset successfully."
}
```

---

## 2. Project API

Base path: `/api/v1/projects`  
All endpoints require 🔒 `Authorization: Bearer <token>`.

---

### POST `/api/v1/projects`
Create a new project. Automatically creates a default Kanban board with 4 columns: Backlog, To Do, In Progress, Done.

**Request Body:**
```json
{
  "name": "My Project",
  "description": "A sample project"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Project created successfully",
  "data": {
    "id": "uuid",
    "name": "My Project",
    "description": "A sample project",
    "ownerId": "uuid",
    "status": "ACTIVE",
    "createdAt": "2026-08-22T00:00:00Z"
  }
}
```

---

### GET `/api/v1/projects?page=0&size=10`
List projects the authenticated user is a member of (paginated).

---

### GET `/api/v1/projects/{projectId}`
Get a single project by ID.

---

### PUT `/api/v1/projects/{projectId}`
Update project name/description.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

---

### DELETE `/api/v1/projects/{projectId}`
Delete a project (OWNER only).

---

### POST `/api/v1/projects/{projectId}/members`
Add or update a project member.

**Request Body:**
```json
{
  "user_id": "uuid",
  "role": "MEMBER"
}
```
Valid roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`

---

### DELETE `/api/v1/projects/{projectId}/members/{userId}`
Remove a member from a project.

---

### GET `/api/v1/projects/{projectId}/boards`
List all Kanban boards in a project.

---

### POST `/api/v1/projects/{projectId}/boards`
Create a new board.

**Request Body:**
```json
{
  "name": "Sprint 1"
}
```

---

### POST `/api/v1/projects/{projectId}/boards/{boardId}/columns`
Create a column in a board.

**Request Body:**
```json
{
  "name": "In Progress",
  "wip_limit": 3
}
```

---

### PUT `/api/v1/projects/{projectId}/boards/{boardId}/columns/{columnId}`
Update a column name or WIP limit.

---

### DELETE `/api/v1/projects/{projectId}/boards/{boardId}/columns/{columnId}`
Delete a column.

---

### GET `/api/v1/projects/{projectId}/tasks`
List all tasks in a project.

---

### PUT `/api/v1/projects/{projectId}/boards/{boardId}/tasks/reorder`
Reorder or move tasks across columns (used by Kanban drag-and-drop).

**Request Body:**
```json
{
  "tasks": [
    { "task_id": "uuid-1", "column_id": "col-uuid-1", "position": 0 },
    { "task_id": "uuid-2", "column_id": "col-uuid-1", "position": 1 },
    { "task_id": "uuid-3", "column_id": "col-uuid-2", "position": 0 }
  ]
}
```

---

## 3. Task API

All endpoints require 🔒 `Authorization: Bearer <token>`.

---

### POST `/api/v1/boards/{boardId}/tasks`
Create a task inside a specific board.

**Request Body:**
```json
{
  "title": "Design login page",
  "description": "Create wireframes",
  "column_id": "uuid",
  "assignee_id": "uuid",
  "due_date": "2026-09-01",
  "priority": "HIGH",
  "labels": ["design", "auth"]
}
```
Valid priorities: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

---

### POST `/api/v1/tasks`
Create a task not tied to a board.

---

### GET `/api/v1/tasks/{taskId}`
Get a single task.

---

### PUT `/api/v1/tasks/{taskId}`
Update a task (title, description, priority, assignee, due date, labels).

---

### PATCH `/api/v1/tasks/{taskId}/status`
Update only the task status.

**Request Body:**
```json
{
  "status": "IN_PROGRESS"
}
```
Valid statuses: `BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`

---

### DELETE `/api/v1/tasks/{taskId}`
Delete a task.

---

## 4. Code Execution API

Base path: `/api/v1/execute`  
Requires 🔒 `Authorization: Bearer <token>` and Docker Desktop running.

---

### POST `/api/v1/execute`
Submit code for sandboxed execution. Returns immediately with an `execution_id`; result is async.

**Request Body:**
```json
{
  "language": "python",
  "source_code": "print('Hello World')",
  "stdin": "",
  "max_time_ms": 5000,
  "max_memory_mb": 128
}
```
Supported `language` values: `python`, `python3`, `javascript`, `node`, `java`, `cpp`, `c++`

**Response (202 Accepted):**
```json
{
  "status": "success",
  "data": {
    "execution_id": "uuid",
    "status": "QUEUED"
  }
}
```

---

### GET `/api/v1/execute/{executionId}`
Poll for result. Keep polling until `status` is terminal.

**Response (200 OK — when complete):**
```json
{
  "status": "success",
  "data": {
    "execution_id": "uuid",
    "status": "COMPLETED",
    "stdout": "Hello World\n",
    "stderr": "",
    "exit_code": 0,
    "execution_time_ms": 342,
    "memory_used_kb": 8192,
    "timed_out": false,
    "oom_killed": false
  }
}
```

| `status` value | Meaning |
|---|---|
| `QUEUED` | Waiting in queue |
| `RUNNING` | Container is executing |
| `COMPLETED` | Finished successfully |
| `FAILED` | Runtime error |
| `TIMEOUT` | Exceeded `max_time_ms` |
| `OOM_KILLED` | Exceeded memory limit |

---

## 5. Notification API

Base path: `/api/notifications`  
All endpoints require 🔒 `Authorization: Bearer <token>`.

---

### GET `/api/notifications?page=0&size=20`
Get paginated notification inbox.

---

### GET `/api/notifications/unread-count`
Get count of unread notifications.

**Response:**
```json
{ "unread_count": 5 }
```

---

### PUT `/api/notifications/{notificationId}/read`
Mark a single notification as read.

---

### PUT `/api/notifications/read-all`
Mark all notifications as read (204 No Content).

---

### DELETE `/api/notifications/{notificationId}`
Delete a notification (204 No Content).

---

## 6. Actuator / Metrics API

### 6.1 Spring Actuator Endpoints

Actuator endpoints are **restricted to ADMIN role** (except `/actuator/health` which is public for liveness probes).

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/actuator/health` | Public | Application health (DB, Redis) |
| `GET` | `/actuator/info` | 🔒 ADMIN | Build/version info |
| `GET` | `/actuator/metrics` | 🔒 ADMIN | Full metrics registry list |
| `GET` | `/actuator/prometheus` | 🔒 ADMIN | Prometheus-format metrics |
| `GET` | `/actuator/metrics/{name}` | 🔒 ADMIN | Single metric (e.g. `jvm.memory.used`, `http.server.requests`) |

---

### 6.2 Admin Dashboard & Metrics API

> 🔒 **Requires `ROLE_ADMIN`.** Returns `403 Forbidden` for any other authenticated role.

---

#### GET `/api/metrics/dashboard`
Returns platform-wide system metrics and service health for the Admin dashboard and Metrics page.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "stats": {
      "total_projects": 42,
      "open_tasks": 17,
      "in_progress_tasks": 9,
      "completed_tasks": 134
    },
    "service_health": [
      { "name": "PostgreSQL", "status": "UP", "response_time_ms": 3 },
      { "name": "Redis",      "status": "UP", "response_time_ms": 1 },
      { "name": "Elasticsearch", "status": "UP", "response_time_ms": 5 },
      { "name": "Docker Engine", "status": "DOWN", "response_time_ms": 4 }
    ],
    "request_throughput": [
      { "timestamp": "2026-08-27T10:00:00Z", "rpm": 1.5, "errors": 0.1 }
    ],
    "request_latency": [
      { "timestamp": "2026-08-27T10:00:00Z", "p50_ms": 45, "p99_ms": 210 }
    ]
  }
}
```

---

#### GET `/api/metrics/dashboard?range=1h`
Same as above but scoped to the requested time range. Valid values: `1h`, `6h`, `24h`, `7d`, `30d` (default: `1h`).

---

### 6.3 User Summary API

> 🔒 **Requires any authenticated role (`ROLE_ADMIN` or `ROLE_MEMBER`).** Each user sees only their own data.

---

#### GET `/api/metrics/user-summary`
Returns a personal activity summary for the currently authenticated user. Powers the Member `UserDashboard` on `/`.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "task_stats": {
      "open": 3,
      "in_progress": 2,
      "completed": 11
    },
    "executions_this_week": 7,
    "recent_executions": [
      {
        "execution_id": "uuid",
        "language": "python",
        "status": "COMPLETED",
        "execution_time_ms": 342,
        "created_at": "2026-08-27T09:15:00Z"
      }
    ],
    "recent_activity": [
      {
        "type": "TASK_MOVED",
        "description": "Moved 'Fix login bug' to Done",
        "timestamp": "2026-08-27T09:10:00Z"
      },
      {
        "type": "CODE_EXECUTED",
        "description": "Ran Python snippet",
        "timestamp": "2026-08-27T09:05:00Z"
      }
    ]
  }
}
```

---

## 7. WebSocket STOMP Topics

**WebSocket URL:** `ws://localhost:8081/ws` (SockJS-compatible)  
Connect with STOMP over SockJS. No separate auth header needed — the JWT is validated during the HTTP upgrade handshake.

| Topic | Direction | Payload | Description |
|---|---|---|---|
| `/topic/logs/{projectId}` | Server → Client | `LogEvent` JSON | Real-time HTTP request log for a project |
| `/topic/notifications/{userId}` | Server → Client | `NotificationResponse` JSON | Real-time push when task assigned or member added |

### LogEvent payload
```json
{
  "method": "POST",
  "uri": "/api/v1/tasks",
  "status": 201,
  "durationMs": 34,
  "userId": "user-uuid",
  "projectId": "project-uuid",
  "timestamp": "2026-08-22T00:00:00Z"
}
```

---

## 8. Common Error Responses

```json
{
  "status": "error",
  "message": "Descriptive error message",
  "timestamp": "2026-08-22T00:00:00Z"
}
```

| HTTP Status | When |
|---|---|
| `400 Bad Request` | Validation failure, malformed body |
| `401 Unauthorized` | Missing, expired, or blacklisted token |
| `403 Forbidden` | Valid token but insufficient RBAC role |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Duplicate resource (e.g., email already registered) |
| `429 Too Many Requests` | Redis rate limit exceeded |
| `500 Internal Server Error` | Unexpected server error |
