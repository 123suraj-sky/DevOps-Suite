# API Design & Contracts — DevOps Suite

> **Base URL (Docker):** `http://localhost:8082`  
> **Base URL (local backend dev):** `http://localhost:8081`  
> **Auth:** All protected endpoints require `Authorization: Bearer <access_token>` header.  
> **Error format:** `{ "status": "error", "message": "...", "timestamp": "..." }`

---

## Table of Contents
1. [Auth API](#1-auth-api)
2. [User Profile & Social API](#2-user-profile--social-api)
3. [Project API](#3-project-api)
4. [Task API](#4-task-api)
5. [Code Execution API](#5-code-execution-api)
6. [IDE Files API](#6-ide-files-api)
7. [Notification API](#7-notification-api)
8. [Log Search API](#8-log-search-api)
9. [Admin Users API](#9-admin-users-api)
10. [Actuator / Metrics API](#10-actuator--metrics-api)
11. [WebSocket STOMP Topics](#11-websocket-stomp-topics)
12. [Common Error Responses](#12-common-error-responses)

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
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": "/uploads/avatars/uuid.jpg",
    "gender": "PREFER_NOT_TO_SAY",
    "roles": ["ROLE_USER"],
    "followers_count": 0,
    "following_count": 0,
    "profile_view_count": 0,
    "created_at": "2026-08-22T00:00:00Z",
    "last_login_at": "2026-09-01T12:00:00Z"
  }
}
```

---

### PUT `/auth/me`  🔒
Update the authenticated user's profile (display name, avatar URL, gender).

**Request Body:**
```json
{
  "display_name": "Jane Doe",
  "avatar_url": "/uploads/avatars/uuid.jpg",
  "gender": "FEMALE"
}
```
Valid `gender` values: `MALE`, `FEMALE`, `NON_BINARY`, `PREFER_NOT_TO_SAY`

**Response (200 OK):** Same structure as `GET /auth/me` data.

---

### PATCH `/auth/me`  🔒
Same as `PUT /auth/me` — partial update alias.

---

### POST `/auth/me/avatar`  🔒
Upload a new profile avatar image. Replaces any existing avatar file.

**Request:** `Content-Type: multipart/form-data` with field `file`.

**Response (200 OK):** Updated user profile (same structure as `GET /auth/me` data).

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
  "message": "If that email is registered you will receive a reset link shortly."
}
```

---

### POST `/auth/reset-password`
Reset password using the token from the email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass456!"
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

### POST `/auth/google`
Authenticate (or register) using a Google ID token.

**Request Body:**
```json
{
  "id_token": "google-id-token",
  "access_token": "google-access-token"
}
```

**Response (200 OK):** Same structure as `POST /auth/login` response.

---

### POST `/auth/github`
Authenticate (or register) using a GitHub authorization code.

**Request Body:**
```json
{
  "code": "github-oauth-code"
}
```

**Response (200 OK):** Same structure as `POST /auth/login` response.

---

## 2. User Profile & Social API

Base path: `/api/users`  
All endpoints require 🔒 `Authorization: Bearer <token>`.

---

### GET `/api/users/{id}`  🔒
Get a public user profile. Non-self visits increment the `profile_view_count`.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": "/uploads/avatars/uuid.jpg",
    "gender": "MALE",
    "roles": ["ROLE_USER"],
    "followers_count": 12,
    "following_count": 5,
    "is_following": false,
    "profile_view_count": 42,
    "created_at": "2026-08-22T00:00:00Z"
  }
}
```

---

### POST `/api/users/{id}/follow`  🔒
Follow another user.

**Response (200 OK):**
```json
{ "status": "success", "message": "Now following user" }
```

---

### DELETE `/api/users/{id}/follow`  🔒
Unfollow a user.

**Response (200 OK):**
```json
{ "status": "success", "message": "Unfollowed user" }
```

---

### GET `/api/users/{id}/followers`  🔒
List users who follow `{id}`.

**Response (200 OK):** Array of user profile summaries.

---

### GET `/api/users/{id}/following`  🔒
List users that `{id}` follows.

**Response (200 OK):** Array of user profile summaries.

---

## 3. Project API

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

## 4. Task API

All endpoints require 🔒 `Authorization: Bearer <token>`.  
All paths accept three equivalent prefixes: `/tasks/{id}`, `/api/tasks/{id}`, `/api/v1/tasks/{id}`.

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
Valid priorities: `LOW`, `MEDIUM`, `HIGH`

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

### POST `/api/v1/tasks/{taskId}/duplicate`
Duplicate a task (creates a copy in the same column). Returns the new task (201 Created).

---

### GET `/api/v1/tasks/{taskId}/history`
Get the audit history for a task (all create/update/status-change events).

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "task_id": "uuid",
      "changed_by": "user-uuid",
      "changed_at": "2026-09-01T10:00:00Z",
      "action": "STATUS_CHANGED",
      "snapshot": { "status": "IN_PROGRESS", "title": "Design login page" }
    }
  ]
}
```
Valid `action` values: `CREATED`, `UPDATED`, `STATUS_CHANGED`, `DUPLICATED`

---

## 5. Code Execution API

Base path: `/api/code-execution`  
Requires 🔒 `Authorization: Bearer <token>` and Docker Desktop running.

---

### POST `/api/code-execution/run`
Submit code for sandboxed execution. Also accepts `/api/code-execution/execute` as an alias. Returns immediately with an `execution_id`; result is async.

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
Supported `language` values: `python`, `javascript`, `java`, `cpp`

**Response (202 Accepted):**
```json
{
  "message": "Execution request accepted",
  "data": {
    "execution_id": "uuid",
    "status": "QUEUED"
  }
}
```

---

### GET `/api/code-execution/{id}`
Poll for result. Keep polling until `status` is terminal.

**Response (200 OK — when complete):**
```json
{
  "message": "Execution query successful",
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

### GET `/api/code-execution/history?page=0&size=20`
Returns the authenticated user's paginated execution history, newest first.

**Response (200 OK):** Array of execution history items.

---

### GET `/api/code-execution/activity?days=365`
Returns daily execution counts for a user (sparse — only days with ≥ 1 execution).  
Optional `userId` param — defaults to the authenticated user.

**Response (200 OK):**
```json
{
  "data": [
    { "date": "2026-09-01", "count": 5 },
    { "date": "2026-09-03", "count": 2 }
  ]
}
```

---

## 6. IDE Files API

Base path: `/api/ide/files`  
All endpoints require 🔒 `Authorization: Bearer <token>`.

---

### GET `/api/ide/files?projectId={uuid}`
Returns the full file tree (metadata only — no content) for a project. Use for rendering the file explorer sidebar.

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Files retrieved",
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "path": "src/main.py",
      "name": "main.py",
      "language": "python",
      "is_folder": false,
      "created_at": "2026-09-01T10:00:00Z",
      "updated_at": "2026-09-01T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/ide/files/{id}`
Returns a single file with full `content`. Called when opening a tab in the editor.

**Response (200 OK):** Same as list item but includes `content` and `user_id`.

---

### POST `/api/ide/files`
Creates a new file or folder entry.

**Request Body:**
```json
{
  "project_id": "uuid",
  "path": "src/utils.py",
  "content": "def greet(name):\n    print(f'Hello, {name}')",
  "language": "python",
  "is_folder": false
}
```
If `is_folder` is `true`, `content` is ignored.

**Response (201 Created):** Full `FileDetail` object.

---

### PUT `/api/ide/files/{id}`
Update file content and/or rename/move it. Any omitted field keeps its current value.

**Request Body:**
```json
{
  "content": "print('updated')",
  "path": "src/renamed.py",
  "language": "python"
}
```

**Response (200 OK):** Updated `FileDetail` object.

---

### DELETE `/api/ide/files/{id}`
Delete a file or folder. Deleting a folder removes all children.

**Response (204 No Content).**

---

## 7. Notification API

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

### GET `/api/notifications/preferences`  🔒
Get all notification preferences for the authenticated user. Returns one entry per notification type; missing types use defaults (`in_app=true`, `email=false`).

**Response (200 OK):**
```json
[
  { "type": "TASK_ASSIGNED", "in_app": true, "email": false },
  { "type": "MEMBER_ADDED",  "in_app": true, "email": true }
]
```

---

### PUT `/api/notifications/preferences/{type}`  🔒
Upsert a single notification preference. Only the fields provided are changed.

**Request Body:**
```json
{ "email": true }
```

**Response (200 OK):** Updated preference object.

---

## 8. Log Search API

Base path: `/api/logs`  
All endpoints require 🔒 `Authorization: Bearer <token>`.

---

### GET `/api/logs/search?projectId={uuid}&query={text}&size=50`
Search historic request logs in Elasticsearch for a given project.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectId` | UUID | Yes | Project whose logs to search |
| `query` | string | No | Free-text filter on `uri` + `method` fields |
| `size` | int | No | Max results (default 50, capped at 500) |

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "method": "GET",
      "uri": "/api/projects/uuid",
      "status": 200,
      "durationMs": 34,
      "userId": "user-uuid",
      "projectId": "project-uuid",
      "timestamp": "2026-09-01T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/logs/services?projectId={uuid}`
Returns distinct service names / URIs seen in the project's logs (for filter dropdowns).

---

## 9. Admin Users API

Base path: `/api/admin/users`  
All endpoints require 🔒 `ROLE_ADMIN`.

---

### GET `/api/admin/users`
List all registered users with roles, last login, and real-time active status (checked via Redis sorted set).

**Response (200 OK):**
```json
{
  "status": "success",
  "totalUsers": 25,
  "activeUsersCount": 3,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "John Doe",
      "avatarUrl": "/uploads/avatars/uuid.jpg",
      "gender": "MALE",
      "oauthProvider": "google",
      "roles": ["ROLE_USER"],
      "createdAt": "2026-08-22T00:00:00Z",
      "lastLoginAt": "2026-09-01T12:00:00Z",
      "activeRecently": true
    }
  ]
}
```

---

### GET `/api/admin/users/{userId}/tasks`
Get all tasks created by or assigned to a specific user across all projects.

**Response (200 OK):**
```json
{
  "status": "success",
  "userId": "uuid",
  "totalTasks": 12,
  "createdCount": 7,
  "assignedCount": 8,
  "data": [ { "taskId": "uuid", "title": "...", "status": "IN_PROGRESS", "priority": "HIGH", "projectName": "...", "isCreator": true, "isAssignee": false } ]
}
```

---

### GET `/api/admin/users/{userId}/logs?query={text}&size=100`
Get request and audit logs for a specific user from Elasticsearch.

**Response (200 OK):**
```json
{
  "status": "success",
  "userId": "uuid",
  "userEmail": "user@example.com",
  "count": 42,
  "data": [ { "method": "POST", "uri": "/api/projects", "status": 201, "timestamp": "2026-09-01T10:00:00Z" } ]
}
```

---

## 10. Actuator / Metrics API

### 10.1 Spring Actuator Endpoints

> `/actuator/health` and `/actuator/prometheus` are **public** (no auth required) — Prometheus scrapes them directly.  
> All other actuator endpoints require `ROLE_ADMIN`.

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/actuator/health` | Public | Application health (DB, Redis) |
| `GET` | `/actuator/prometheus` | Public | Prometheus-format metrics scrape |
| `GET` | `/actuator/info` | 🔒 ADMIN | Build/version info |
| `GET` | `/actuator/metrics` | 🔒 ADMIN | Full metrics registry list |
| `GET` | `/actuator/metrics/{name}` | 🔒 ADMIN | Single metric (e.g. `jvm.memory.used`, `http.server.requests`) |

---

### 10.2 Admin Dashboard & Metrics API

> 🔒 **Requires `ROLE_ADMIN`.** Returns `403 Forbidden` for other roles.

---

#### GET `/api/metrics/dashboard?range=1h`
Returns platform-wide system metrics and service health. Also accepts optional `projectId` to scope to a single project.

Valid `range` values: `1h` (default), `6h`, `24h`, `7d`, `30d`

---

#### GET `/api/metrics/requests?query={text}&size=100`
Returns recent HTTP request records from Elasticsearch. Powers the detailed view in RPM/latency graph modals.

---

### 10.3 User Summary API

> 🔒 **Any authenticated user.** Each user sees only their own data.

---

#### GET `/api/metrics/user-summary`
Returns a personal activity summary for the currently authenticated user (task stats, executions this week, recent activity).

---

## 11. WebSocket STOMP Topics

**WebSocket URL (Docker):** `ws://localhost:8082/ws` (SockJS-compatible)  
**WebSocket URL (local dev):** `ws://localhost:8081/ws`  
Connect with STOMP over SockJS. The JWT is validated during the STOMP CONNECT frame via `StompAuthChannelInterceptor`.

| Topic | Direction | Payload | Description |
|---|---|---|---|
| `/topic/logs/{projectId}` | Server → Client | `LogEvent` JSON | Real-time HTTP request log for a project |
| `/topic/notifications/{userId}` | Server → Client | `NotificationResponse` JSON | Real-time push for task assignment, member add, etc. |
| `/topic/tasks/{projectId}` | Server → Client | `TaskEvent` JSON | Granular Kanban task updates (CREATED / UPDATED / STATUS_CHANGED / MOVED / DELETED) |

### LogEvent payload
```json
{
  "method": "POST",
  "uri": "/api/projects",
  "status": 201,
  "durationMs": 34,
  "userId": "user-uuid",
  "projectId": "project-uuid",
  "timestamp": "2026-09-01T10:00:00Z"
}
```

---

## 12. Common Error Responses

```json
{
  "status": "error",
  "message": "Descriptive error message",
  "timestamp": "2026-09-01T10:00:00Z"
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
