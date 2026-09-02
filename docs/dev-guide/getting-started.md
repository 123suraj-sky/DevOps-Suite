# Developer Guide — Running & Testing DevOps Suite

> This guide covers how to start the entire stack, create your first user, and call every API via Postman.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Starting the Stack](#3-starting-the-stack)
4. [User Creation Guide](#4-user-creation-guide)
5. [Postman — Auth APIs](#5-postman--auth-apis)
6. [Postman — Project APIs](#6-postman--project-apis)
7. [Postman — Task APIs](#7-postman--task-apis)
8. [Postman — Code Execution API](#8-postman--code-execution-api)
9. [Postman — Notification API](#9-postman--notification-api)
10. [Postman — Actuator / Metrics APIs](#10-postman--actuator--metrics-apis)
11. [WebSocket Real-Time Topics](#11-websocket-real-time-topics)
12. [Observability UIs](#12-observability-uis)
13. [Postman Tips & Collection Setup](#13-postman-tips--collection-setup)
14. [Stopping Everything](#14-stopping-everything)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Docker Desktop** | Latest | Runs PostgreSQL, Redis, Elasticsearch, Kibana, Prometheus, Grafana |
| **Java JDK** | 21+ | Compiles and runs Spring Boot backend |
| **Apache Maven** | 3.9+ | Backend build tool |
| **Node.js** | 24+ | Frontend dev server |
| **npm** | 9+ | Frontend package manager |
| **Postman** | Any | API testing client |

> Make sure Docker Desktop is running before starting anything else.

---

## 2. Environment Setup

### Backend
The backend reads from `backend/src/main/resources/application.yml`. All settings have Docker-compatible defaults — no changes needed for local development.

Optional overrides (set before running):
```powershell
$env:JWT_SECRET = "my-super-secret-key-minimum-32chars-long"
$env:DB_PASSWORD = "password"
$env:GOOGLE_CLIENT_ID = "your-id"       # Only if using Google OAuth
$env:GOOGLE_CLIENT_SECRET = "your-secret"
```

### Frontend
`frontend/.env` is pre-configured:
```
VITE_API_URL=http://localhost:8081/api
VITE_WS_URL=ws://localhost:8081/ws
```
No changes needed for local development.

---

## 3. Starting the Stack

### Step 1 — Start infrastructure (minimum)
```powershell
docker-compose up -d postgres redis
```

Wait ~15 seconds for PostgreSQL to be ready.

### Step 1 (optional) — Full observability stack
```powershell
docker-compose up -d
```
This also starts Elasticsearch, Kibana, Prometheus, and Grafana.

### Step 2 — Run the backend
```powershell
mvn spring-boot:run
```
Run from `d:\Projects\DevOps Suite\backend\`.

The backend starts on **`http://localhost:8081`**.

Watch for:
```
Started DevOpsSuiteApplication in X.XXX seconds
```

Flyway will automatically run `V1__initial_schema.sql` and create all tables on first boot.

### Step 3 — Run the frontend
```powershell
npm install    # Only needed the first time
npm run dev
```
Run from `d:\Projects\DevOps Suite\frontend\`.

The frontend starts on **`http://localhost:5173`**.

---

## 4. User Creation Guide

### Option A — Via the Frontend (Recommended)
1. Open `http://localhost:5173`
2. Click **Register** on the login page
3. Enter Email, Display Name, and Password
4. Submit — you will be auto-logged in and redirected to the dashboard

### Option B — Via Postman (API)

**POST** `http://localhost:8081/auth/register`

**Body:**
```json
{
  "email": "developer@example.com",
  "password": "SecurePass123!",
  "display_name": "Dev User"
}
```

**Expected Response (201 Created):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user_id": "a1b2c3d4-...",
    "email": "developer@example.com",
    "display_name": "Dev User",
    "created_at": "2026-08-22T00:00:00Z"
  }
}
```

---

## 5. Postman — Auth APIs

### Collection Setup
1. Open Postman → **New Collection** → Name it `DevOps Suite`
2. Go to **Variables** tab and add:
   - `base_url` = `http://localhost:8081`
   - `token` = *(leave empty)*

### 5.1 Register
| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/auth/register` |

**Body:**
```json
{
  "email": "you@example.com",
  "password": "YourPassword123",
  "display_name": "Your Name"
}
```

---

### 5.2 Login
| Field | Value |
|---|---|
| Method | `POST` |
| URL | `{{base_url}}/auth/login` |

**Body:**
```json
{
  "email": "you@example.com",
  "password": "YourPassword123"
}
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiJ9...",
    "expires_in": 3600000,
    "token_type": "Bearer"
  }
}
```

> **Tip:** Add a Postman Test script to auto-save the token:
> ```javascript
> const json = pm.response.json();
> pm.collectionVariables.set("token", json.data.access_token);
> ```

---

### 5.3 Get Current User (Me)
| Method | URL | Auth |
|---|---|---|
| `GET` | `{{base_url}}/auth/me` | Bearer `{{token}}` |

---

### 5.4 Refresh Token
| Method | URL |
|---|---|
| `POST` | `{{base_url}}/auth/refresh` |

**Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

---

### 5.5 Logout
| Method | URL | Auth |
|---|---|---|
| `POST` | `{{base_url}}/auth/logout` | Bearer `{{token}}` |

**Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

Both tokens are blacklisted in Redis immediately.

---

### 5.6 Forgot Password
| Method | URL |
|---|---|
| `POST` | `{{base_url}}/auth/forgot-password` |

**Body:**
```json
{
  "email": "you@example.com"
}
```

---

### 5.7 Reset Password
| Method | URL |
|---|---|
| `POST` | `{{base_url}}/auth/reset-password` |

**Body:**
```json
{
  "token": "reset-token-from-email",
  "new_password": "NewSecurePass456!"
}
```

---

## 6. Postman — Project APIs

> All project requests require: **Authorization: Bearer {{token}}**

### 6.1 Create Project
| Method | URL |
|---|---|
| `POST` | `{{base_url}}/api/v1/projects` |

**Body:**
```json
{
  "name": "My First Project",
  "description": "Building something great"
}
```

> Creates a default Kanban board with Backlog, To Do, In Progress, and Done columns automatically.

---

### 6.2 List Projects
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/projects?page=0&size=10` |

---

### 6.3 Get / Update / Delete Project
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/projects/{projectId}` |
| `PUT` | `{{base_url}}/api/v1/projects/{projectId}` |
| `DELETE` | `{{base_url}}/api/v1/projects/{projectId}` |

---

### 6.4 Add Member to Project
| Method | URL |
|---|---|
| `POST` | `{{base_url}}/api/v1/projects/{projectId}/members` |

**Body:**
```json
{
  "user_id": "uuid-of-the-user",
  "role": "MEMBER"
}
```

Valid roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`

---

### 6.5 Remove Member
| Method | URL |
|---|---|
| `DELETE` | `{{base_url}}/api/v1/projects/{projectId}/members/{userId}` |

---

### 6.6 Create Board
| Method | URL |
|---|---|
| `POST` | `{{base_url}}/api/v1/projects/{projectId}/boards` |

**Body:**
```json
{
  "name": "Sprint 1"
}
```

---

### 6.7 List Boards
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/projects/{projectId}/boards` |

---

### 6.8 Create Column
| Method | URL |
|---|---|
| `POST` | `{{base_url}}/api/v1/projects/{projectId}/boards/{boardId}/columns` |

**Body:**
```json
{
  "name": "In Progress",
  "wip_limit": 3
}
```

---

## 7. Postman — Task APIs

> All task requests require: **Authorization: Bearer {{token}}**

### 7.1 Create Task (in a Board)
| Method | URL |
|---|---|
| `POST` | `{{base_url}}/api/v1/boards/{boardId}/tasks` |

**Body:**
```json
{
  "title": "Design login page",
  "description": "Create wireframes for the auth flow",
  "column_id": "uuid-of-a-column",
  "priority": "HIGH"
}
```

---

### 7.2 Get / Update / Delete Task
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/tasks/{taskId}` |
| `PUT` | `{{base_url}}/api/v1/tasks/{taskId}` |
| `DELETE` | `{{base_url}}/api/v1/tasks/{taskId}` |

---

### 7.3 Update Task Status
| Method | URL |
|---|---|
| `PATCH` | `{{base_url}}/api/v1/tasks/{taskId}/status` |

**Body:**
```json
{
  "status": "IN_PROGRESS"
}
```

Valid statuses: `BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`

---

### 7.4 List All Tasks in a Project
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/projects/{projectId}/tasks` |

---

### 7.5 Reorder Tasks (Kanban drag-and-drop)
| Method | URL |
|---|---|
| `PUT` | `{{base_url}}/api/v1/projects/{projectId}/boards/{boardId}/tasks/reorder` |

**Body:**
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

## 8. Postman — Code Execution API

> Requires: **Authorization: Bearer {{token}}** and Docker Desktop running.

### 8.1 Submit Code
| Method | URL |
|---|---|
| `POST` | `{{base_url}}/api/v1/execute` |

**Body (Python):**
```json
{
  "language": "python",
  "source_code": "print('Hello, DevOps Suite!')\nfor i in range(3):\n    print(i)",
  "stdin": "",
  "max_time_ms": 5000,
  "max_memory_mb": 128
}
```

**Body (JavaScript):**
```json
{
  "language": "javascript",
  "source_code": "console.log('Hello from Node.js!');",
  "max_time_ms": 5000
}
```

**Body (Java):**
```json
{
  "language": "java",
  "source_code": "public class Main { public static void main(String[] args) { System.out.println(\"Hello Java!\"); } }",
  "max_time_ms": 10000
}
```

**Body (C++):**
```json
{
  "language": "cpp",
  "source_code": "#include <iostream>\nint main() { std::cout << \"Hello C++!\" << std::endl; return 0; }",
  "max_time_ms": 10000
}
```

**Expected Response (202 Accepted):**
```json
{
  "status": "success",
  "data": {
    "execution_id": "abc-123-...",
    "status": "QUEUED"
  }
}
```

---

### 8.2 Poll for Result
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/execute/{execution_id}` |

Poll every 1-2 seconds until `status` is terminal.

**Final Response:**
```json
{
  "status": "success",
  "data": {
    "execution_id": "abc-123-...",
    "status": "COMPLETED",
    "stdout": "Hello, DevOps Suite!\n0\n1\n2\n",
    "stderr": "",
    "exit_code": 0,
    "execution_time_ms": 342,
    "memory_used_kb": 8192,
    "timed_out": false,
    "oom_killed": false
  }
}
```

| Status | Meaning |
|---|---|
| `QUEUED` | Waiting in queue |
| `RUNNING` | Container executing |
| `COMPLETED` | Finished successfully |
| `FAILED` | Runtime error |
| `TIMEOUT` | Exceeded `max_time_ms` |
| `OOM_KILLED` | Exceeded memory limit |

---

## 9. Postman — Notification API

> Requires: **Authorization: Bearer {{token}}**

### 9.1 Get Notification Inbox
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/notifications?page=0&size=20` |

---

### 9.2 Get Unread Count
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/notifications/unread-count` |

**Response:**
```json
{ "unread_count": 5 }
```

---

### 9.3 Mark Single Notification as Read
| Method | URL |
|---|---|
| `PUT` | `{{base_url}}/api/notifications/{notificationId}/read` |

---

### 9.4 Mark All as Read
| Method | URL |
|---|---|
| `PUT` | `{{base_url}}/api/notifications/read-all` |

---

### 9.5 Delete a Notification
| Method | URL |
|---|---|
| `DELETE` | `{{base_url}}/api/notifications/{notificationId}` |

---

## 10. Postman — Actuator / Metrics APIs

These are **public** — no token required.

| Name | Method | URL |
|---|---|---|
| Health check | `GET` | `http://localhost:8081/actuator/health` |
| App info | `GET` | `http://localhost:8081/actuator/info` |
| All metrics list | `GET` | `http://localhost:8081/actuator/metrics` |
| Prometheus format | `GET` | `http://localhost:8081/actuator/prometheus` |
| Specific metric | `GET` | `http://localhost:8081/actuator/metrics/jvm.memory.used` |
| HTTP request stats | `GET` | `http://localhost:8081/actuator/metrics/http.server.requests` |

---

## 11. WebSocket Real-Time Topics

The backend exposes a STOMP WebSocket at `ws://localhost:8081/ws` (SockJS-compatible).

### Subscribable Topics

| Topic | Payload | Description |
|---|---|---|
| `/topic/logs/{projectId}` | `LogEvent` JSON | Real-time request logs for a project. Emitted by every HTTP request that matches `/projects/{projectId}/...` |
| `/topic/notifications/{userId}` | `NotificationResponse` JSON | Real-time in-app notification push when a task is assigned or member added |

### LogEvent Payload Example
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

### Testing in Postman
1. Create a new **WebSocket** request in Postman
2. URL: `ws://localhost:8081/ws`
3. Connect → send STOMP CONNECT frame → then SUBSCRIBE to a topic

### How It's Wired in Frontend
- `WebSocketContext.jsx` manages the STOMP connection lifecycle
- `LogsPage` subscribes to `/topic/logs/{projectId}` on mount
- `NotificationContext.jsx` subscribes to `/topic/notifications/{userId}` globally

---

## 12. Observability UIs

| UI | URL | Purpose |
|---|---|---|
| **Grafana** | `http://localhost:3000` | JVM + HTTP metrics dashboards (Prometheus data source) |
| **Kibana** | `http://localhost:5601` | Log explorer — browse `devopssuite-logs-*` indices |
| **Prometheus** | `http://localhost:9090` | Raw metrics, query with PromQL |
| **Backend API** | `http://localhost:8081` | Spring Boot REST API |
| **Frontend** | `http://localhost:5173` | React SPA |

### Kibana — View Logs
1. Open `http://localhost:5601`
2. Go to **Discover** → Create a data view with pattern `devopssuite-logs-*`
3. Set the time field to `timestamp`
4. Browse real-time request logs

### Grafana — View Metrics
1. Open `http://localhost:3000` (default login: `admin` / `admin`)
2. Go to **Dashboards** → Select pre-configured JVM or HTTP dashboard

---

## 13. Postman Tips & Collection Setup

### Auto-save Token After Login
In your **Login request → Tests tab**:
```javascript
const json = pm.response.json();
if (json.data && json.data.access_token) {
    pm.collectionVariables.set("token", json.data.access_token);
    pm.collectionVariables.set("refresh_token", json.data.refresh_token);
    console.log("Token saved.");
}
```

### Auto-save Project ID
In your **Create Project request → Tests tab**:
```javascript
const json = pm.response.json();
if (json.data && json.data.id) {
    pm.collectionVariables.set("projectId", json.data.id);
}
```

### Set Authorization on the Collection
1. Go to **DevOps Suite** collection → **Authorization** tab
2. Type: **Bearer Token**
3. Token: `{{token}}`

Every request in the collection will use the token automatically.

### Common HTTP Status Codes
| Code | Meaning |
|---|---|
| `200 OK` | Success |
| `201 Created` | Resource created |
| `202 Accepted` | Async task accepted (code submission) |
| `204 No Content` | Success, no response body |
| `400 Bad Request` | Validation error |
| `401 Unauthorized` | Missing or invalid/expired token |
| `403 Forbidden` | Valid token, insufficient permissions |
| `404 Not Found` | Resource not found |
| `409 Conflict` | Duplicate (e.g., email already registered) |
| `429 Too Many Requests` | Rate limit exceeded (Redis-backed) |

---

## 14. Stopping Everything

```powershell
# Stop Docker containers (keeps data volumes)
docker-compose down

# Stop and wipe all data (fresh start)
docker-compose down -v

# Kill backend: Ctrl+C in the terminal running mvn spring-boot:run
# Kill frontend: Ctrl+C in the terminal running npm run dev
```

---

## 15. Troubleshooting

### Backend won't start
- **"Connection refused" to PostgreSQL** — Run `docker-compose up -d postgres` first, wait 15 seconds.
- **"Could not validate token"** — Check `JWT_SECRET` is set consistently.
- **Port 8081 already in use** — Find and kill the process on that port.
- **Flyway migration error** — Try `docker-compose down -v` then `docker-compose up -d postgres` to reset the DB volume.

### 401 Unauthorized in Postman
- Token may have expired (1h TTL). Re-run the Login request to get a fresh token.
- Ensure `Authorization` header is `Bearer {{token}}` and the collection variable is populated.
- If you logged out, the token is blacklisted in Redis — log in again.

### Frontend shows blank / no data
- Confirm backend is running on port `8081`.
- Check browser DevTools → Network tab for failed API calls.
- Confirm `frontend/.env` has `VITE_API_URL=http://localhost:8081/api`.

### Code execution times out or fails
- Ensure Docker Desktop is running.
- On first run, Docker pulls the language images — this can take 1-2 minutes.
- Java and C++ take longer to compile — increase `max_time_ms` if needed.

### Logs not appearing in Kibana
- Elasticsearch needs ~30 seconds after startup before indices are queryable.
- Confirm the `devopssuite-logs-*` data view is created in Kibana Discover.
- Check that the backend can reach Elasticsearch: `GET http://localhost:9200` should return cluster info.

### Grafana shows no data
- Confirm Prometheus is running: `http://localhost:9090` should be accessible.
- Confirm the backend is exposing metrics: `GET http://localhost:8081/actuator/prometheus`.
- In Grafana, verify the Prometheus data source URL is `http://prometheus:9090`.

### WebSocket not connecting
- Ensure the backend is running and the WebSocket endpoint is at `ws://localhost:8081/ws`.
- The connection is established automatically after login via `WebSocketContext.jsx`.
- Check browser DevTools → Network tab → WS for the SockJS handshake.
