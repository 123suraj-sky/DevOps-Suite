# DevOps Suite — Project Overview

> A single document that explains **what this project is**, **how everything connects**, **every API it exposes**, and **how to get started in Postman from zero**.

---

## Table of Contents
1. [What Is This Project?](#1-what-is-this-project)
2. [The Big Picture — Architecture](#2-the-big-picture--architecture)
3. [How the Backend Works](#3-how-the-backend-works)
4. [How the Frontend + Backend Work Together](#4-how-the-frontend--backend-work-together)
5. [Every API at a Glance](#5-every-api-at-a-glance)
6. [Postman Quickstart — Zero to Working in 10 Minutes](#6-postman-quickstart--zero-to-working-in-10-minutes)
7. [Real-Time Features (WebSocket)](#7-real-time-features-websocket)
8. [Observability Stack](#8-observability-stack)

---

## 1. What Is This Project?

DevOps Suite is a **full-stack developer productivity platform** that combines four tools engineers use daily:

| Tool | What it does in this project |
|---|---|
| 🧑‍💻 **Code Runner** | Submit Python, JS, Java, or C++ code — executed in an isolated Docker sandbox — and see output in seconds |
| 📁 **Project Manager** | Kanban boards with drag-and-drop tasks, columns, members, and RBAC roles |
| 📊 **Log Monitor** | Every HTTP request to the backend is logged in real-time to both Elasticsearch (for Kibana) and your browser (via WebSocket) |
| 📈 **Metrics Dashboard** | JVM, memory, and request stats scraped by Prometheus and visualized in Grafana |

**Stack at a glance:**
- Backend: Spring Boot 3 monolith (Java 21), port `8081`
- Frontend: React 18 + Vite SPA, port `5173`
- Auth: JWT (access 1h, refresh 7d) + Redis token blacklist
- DB: PostgreSQL (single schema, Flyway migrations)
- Cache: Redis (token blacklist + rate limiting)
- Sandbox: Docker containers (ephemeral, no-network, 1CPU, 256MB)
- Logs: Elasticsearch + Kibana
- Metrics: Prometheus + Grafana

---

## 2. The Big Picture — Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Browser                           │
│                                                                 │
│   React SPA (port 5173)                                         │
│   ├── Axios HTTP calls  ──────────────────────────────────────► │
│   └── SockJS/STOMP WebSocket  ────────────────────────────────► │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP (REST) + WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Spring Boot Monolith (port 8081)                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   Auth   │  │ Project  │  │Execution │  │Notification  │   │
│  │ Module   │  │ Module   │  │ Module   │  │  Module      │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                 │
│  ┌───────────────────────┐   ┌────────────────────────────┐    │
│  │   Logging Module      │   │   Security Layer           │    │
│  │  (filter→event→ES+WS) │   │  (JWT filter + RBAC)       │    │
│  └───────────────────────┘   └────────────────────────────┘    │
└──────┬──────────┬──────────────────────┬────────────────────────┘
       │          │                      │
       ▼          ▼                      ▼
┌──────────┐ ┌──────────┐       ┌───────────────┐
│PostgreSQL│ │  Redis   │       │ Docker Engine │
│(port5432)│ │(port6379)│       │  (Sandbox)    │
└──────────┘ └──────────┘       └───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│          Observability Stack         │
│  Elasticsearch ◄── logs             │
│  Kibana (5601)  ── log explorer      │
│  Prometheus (9090) ◄── /actuator    │
│  Grafana (3000) ── dashboards        │
└──────────────────────────────────────┘
```

---

## 3. How the Backend Works

### 3.1 Every Request Goes Through the Security Filter

Every HTTP request hits `JwtRequestFilter` before any controller code runs:

```
Incoming Request
      │
      ▼
JwtRequestFilter
  ├── Is route public? (login, register, actuator, /ws) → skip
  ├── Extract "Authorization: Bearer <token>" header
  ├── Validate JWT signature (using JWT_SECRET)
  ├── Check Redis: is this token blacklisted? (logged out?)
  │     └── Yes → 401 Unauthorized
  └── Set SecurityContext with userId as principal
      │
      ▼
Controller → Service → Repository → PostgreSQL
```

### 3.2 Auth Flow (Login)

```
POST /auth/login
      │
AuthController.login()
      │
AuthService.login()
  ├── Load user from PostgreSQL by email
  ├── BCrypt.verify(inputPassword, storedHash)
  ├── Generate access token (JWT, 1h TTL)
  ├── Generate refresh token (JWT, 7d TTL)
  └── Return both tokens
      │
Client stores tokens in localStorage
```

### 3.3 Auth Flow (Logout)

```
POST /auth/logout  (with access token in header + refresh token in body)
      │
AuthService.logout()
  ├── Extract remaining TTL from access token
  ├── Store access token in Redis with TTL = remaining lifetime
  ├── Store refresh token in Redis with TTL = remaining lifetime
  └── Both tokens are now permanently invalid
```

### 3.4 Code Execution Flow

```
POST /api/v1/execute  { language: "python", source_code: "..." }
      │
ExecutionController → ExecutionService
  ├── Save ExecutionRequest to DB (status = QUEUED)
  └── Push request ID onto internal BlockingQueue
      │                              │
      │                    ExecutionQueueWorker (background thread)
      │                              │
      │                    DockerSandbox.run()
      │                      ├── Pull language image if missing
      │                      ├── Write source code to temp file
      │                      ├── docker run --network=none --memory=256m
      │                      │           --cpus=1 --rm <image> <file>
      │                      ├── Capture stdout + stderr
      │                      └── Save ExecutionResult to DB (status = COMPLETED/FAILED/TIMEOUT)
      │
Client polls GET /api/v1/execute/{id} every 1-2 seconds
  └── Returns result once status is terminal
```

### 3.5 Logging Flow (Every Request)

```
Any HTTP Request arrives
      │
RequestLoggingFilter (runs AFTER controller responds)
  ├── Measures request duration
  ├── Extracts userId from SecurityContext
  ├── Extracts projectId from URI (regex match on /projects/{uuid})
  └── Publishes LogEvent (Spring Application Event)
      │
      ├── ElasticsearchLogService (@EventListener @Async)
      │     └── Indexes JSON doc into "devopssuite-logs-yyyy.MM.dd" index
      │
      └── LogStreamingService (@EventListener @Async)
            └── If projectId is present:
                  SimpMessagingTemplate.convertAndSend("/topic/logs/{projectId}", event)
                  → Pushed in real-time to browser via WebSocket
```

### 3.6 Notification Flow

```
TaskService.assignTask() or ProjectService.addMember()
      │
ApplicationEventPublisher.publishEvent(TaskAssignedEvent / MemberAddedEvent)
      │
NotificationEventListener (@EventListener @Async)
  ├── Persist Notification entity to DB
  └── SimpMessagingTemplate.convertAndSend("/topic/notifications/{userId}", notification)
        → Pushed in real-time to browser via WebSocket
```

---

## 4. How the Frontend + Backend Work Together

### 4.1 Startup & Auth

```
User opens http://localhost:5173
      │
App.jsx mounts → AuthProvider initializes
  ├── Read access_token from localStorage
  ├── If token exists: call GET /auth/me
  │     ├── Success → set user state → show dashboard
  │     └── 401 → clear localStorage → show login page
  └── If no token → show login page

User logs in:
  LoginPage → authService.login() → POST /auth/login
    ├── Store access_token in localStorage
    ├── Store refresh_token in localStorage
    ├── Set user in AuthContext
    └── Navigate to /dashboard
```

### 4.2 Every API Call (Protected)

```
User action (e.g., create project)
      │
React Component calls projectApi.createProject(data)
      │
Axios request interceptor (client.js)
  └── Attaches "Authorization: Bearer <token>" from localStorage
      │
POST http://localhost:8081/api/v1/projects
      │
Backend processes, returns response
      │
Axios response interceptor
  ├── 200/201 → return data to component
  └── 401 → try refreshToken() → if fails → logout → redirect to /login
      │
Component updates state → React re-renders UI
```

### 4.3 Kanban Board (Drag & Drop)

```
User drags task from "To Do" to "In Progress"
      │
react-beautiful-dnd / @hello-pangea/dnd fires onDragEnd
      │
TasksPage updates local column state immediately (optimistic UI)
      │
taskApi.reorderTasks(projectId, boardId, { tasks: [...] })
  └── PUT /api/v1/projects/{id}/boards/{boardId}/tasks/reorder
        └── Backend updates task.columnId and task.position in DB
```

### 4.4 Code Editor

```
User writes Python code in Monaco Editor
User clicks "Run"
      │
CodeEditorPage → codeExecutionApi.submitExecution(data)
  └── POST /api/v1/execute → returns { execution_id, status: "QUEUED" }
      │
Frontend starts polling loop:
  setInterval(() => {
    codeExecutionApi.getExecutionResult(execution_id)
      .then(result => {
        if (result.status !== "QUEUED" && result.status !== "RUNNING") {
          clearInterval(); // Stop polling
          display(result.stdout, result.stderr);
        }
      });
  }, 1500);
```

### 4.5 Real-Time Log Viewer

```
User opens /projects/:id/logs
      │
LogsPage mounts → subscribes via WebSocketContext:
  stompClient.subscribe("/topic/logs/{projectId}", (frame) => {
    setLogs(prev => [...prev, JSON.parse(frame.body)]);
  })
      │
Every HTTP request made to the backend (by any user in that project)
  → RequestLoggingFilter publishes LogEvent
  → LogStreamingService sends to "/topic/logs/{projectId}"
  → LogsPage receives it and appends to the log list in real-time
```

### 4.6 Real-Time Notifications

```
Backend assigns a task to a user
  → TaskAssignedEvent published
  → NotificationEventListener saves to DB
  → Sends to "/topic/notifications/{userId}" via WebSocket
      │
NotificationContext (global, mounted in App.jsx):
  stompClient.subscribe("/topic/notifications/{userId}", (frame) => {
    addNotification(JSON.parse(frame.body)); // queues a toast
  })
      │
Header component reads notification count from NotificationContext
  → Shows red badge count
  → User clicks → navigates to /notifications
  → NotificationsPage fetches full inbox via GET /api/notifications
```

### 4.7 Metrics Dashboard

```
User opens /metrics
      │
MetricsPage mounts → calls metricsApi.getAllMetrics()
  └── GET /actuator/metrics → lists all metric names
      │
MetricsPage calls metricsApi.getMetric("jvm.memory.used"),
                            getMetric("http.server.requests"), etc.
      │
Recharts renders line/bar charts from the returned data
      │
Auto-refresh every 30s (setInterval) to keep charts live
```

---

## 5. Every API at a Glance

> 🔒 = requires `Authorization: Bearer <token>` header

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login → get tokens |
| POST | `/auth/refresh` | ❌ | Refresh access token |
| POST | `/auth/logout` | 🔒 | Blacklist tokens in Redis |
| GET | `/auth/me` | 🔒 | Get own user profile |
| POST | `/auth/forgot-password` | ❌ | Request password reset email |
| POST | `/auth/reset-password` | ❌ | Reset password with token |

### Projects
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/projects` | 🔒 | Create project |
| GET | `/api/v1/projects` | 🔒 | List my projects (paginated) |
| GET | `/api/v1/projects/{id}` | 🔒 | Get project |
| PUT | `/api/v1/projects/{id}` | 🔒 | Update project |
| DELETE | `/api/v1/projects/{id}` | 🔒 | Delete project |
| POST | `/api/v1/projects/{id}/members` | 🔒 | Add/update member |
| DELETE | `/api/v1/projects/{id}/members/{userId}` | 🔒 | Remove member |
| GET | `/api/v1/projects/{id}/boards` | 🔒 | List boards |
| POST | `/api/v1/projects/{id}/boards` | 🔒 | Create board |
| POST | `/api/v1/projects/{id}/boards/{boardId}/columns` | 🔒 | Create column |
| PUT | `/api/v1/projects/{id}/boards/{boardId}/columns/{colId}` | 🔒 | Update column |
| DELETE | `/api/v1/projects/{id}/boards/{boardId}/columns/{colId}` | 🔒 | Delete column |
| GET | `/api/v1/projects/{id}/tasks` | 🔒 | List all project tasks |
| PUT | `/api/v1/projects/{id}/boards/{boardId}/tasks/reorder` | 🔒 | Reorder/move tasks |

### Tasks
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/boards/{boardId}/tasks` | 🔒 | Create task in board |
| POST | `/api/v1/tasks` | 🔒 | Create task (general) |
| GET | `/api/v1/tasks/{id}` | 🔒 | Get task |
| PUT | `/api/v1/tasks/{id}` | 🔒 | Update task |
| PATCH | `/api/v1/tasks/{id}/status` | 🔒 | Update status only |
| DELETE | `/api/v1/tasks/{id}` | 🔒 | Delete task |

### Code Execution
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/execute` | 🔒 | Submit code (async) |
| GET | `/api/v1/execute/{id}` | 🔒 | Poll for result |

### Notifications
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | 🔒 | Paginated inbox |
| GET | `/api/notifications/unread-count` | 🔒 | Unread count |
| PUT | `/api/notifications/{id}/read` | 🔒 | Mark as read |
| PUT | `/api/notifications/read-all` | 🔒 | Mark all as read |
| DELETE | `/api/notifications/{id}` | 🔒 | Delete notification |

### Actuator (Public)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/actuator/health` | Health check |
| GET | `/actuator/metrics` | All metric names |
| GET | `/actuator/prometheus` | Prometheus scrape |
| GET | `/actuator/metrics/{name}` | Single metric value |

### WebSocket Topics
| Topic | Trigger | Subscriber |
|---|---|---|
| `/topic/logs/{projectId}` | Every HTTP request on a project | LogsPage |
| `/topic/notifications/{userId}` | Task assigned / member added | NotificationContext (global) |

---

## 6. Postman Quickstart — Zero to Working in 10 Minutes

### Step 1 — Create a Collection
1. Open Postman → **New Collection** → name it `DevOps Suite`
2. Go to **Variables** tab, add:
   - `base_url` → `http://localhost:8081`
   - `token` → *(leave empty)*
   - `refresh_token` → *(leave empty)*
   - `projectId` → *(leave empty)*
3. Go to **Authorization** tab → Type: **Bearer Token** → Token: `{{token}}`

---

### Step 2 — Register a User

**POST** `{{base_url}}/auth/register`

Body (raw JSON):
```json
{
  "email": "you@example.com",
  "password": "SecurePass123!",
  "display_name": "Your Name"
}
```

Expected: `201 Created`

---

### Step 3 — Login & Auto-Save Token

**POST** `{{base_url}}/auth/login`

Body:
```json
{
  "email": "you@example.com",
  "password": "SecurePass123!"
}
```

In the **Tests** tab, paste this to auto-save your token:
```javascript
const json = pm.response.json();
if (json.data && json.data.access_token) {
    pm.collectionVariables.set("token", json.data.access_token);
    pm.collectionVariables.set("refresh_token", json.data.refresh_token);
    console.log("Tokens saved.");
}
```

From now on, every request in the collection automatically gets `Authorization: Bearer <token>`.

---

### Step 4 — Verify Your Identity

**GET** `{{base_url}}/auth/me`

Expected: Your user profile JSON.

---

### Step 5 — Create a Project

**POST** `{{base_url}}/api/v1/projects`

Body:
```json
{
  "name": "My First Project",
  "description": "Learning DevOps Suite"
}
```

In the **Tests** tab:
```javascript
const json = pm.response.json();
if (json.data && json.data.id) {
    pm.collectionVariables.set("projectId", json.data.id);
}
```

---

### Step 6 — Create a Task

**POST** `{{base_url}}/api/v1/projects/{{projectId}}/boards`  
First, get a boardId from the boards list:

**GET** `{{base_url}}/api/v1/projects/{{projectId}}/boards`

Then create a task:  
**POST** `{{base_url}}/api/v1/boards/{boardId}/tasks`

Body:
```json
{
  "title": "My first task",
  "description": "Getting started",
  "priority": "HIGH"
}
```

---

### Step 7 — Run Some Code

**POST** `{{base_url}}/api/v1/execute`

Body:
```json
{
  "language": "python",
  "source_code": "name = input()\nprint(f'Hello, {name}!')",
  "stdin": "DevOps Suite",
  "max_time_ms": 5000
}
```

Copy the `execution_id` from the response, then:

**GET** `{{base_url}}/api/v1/execute/{execution_id}`

Keep calling until `status` is `COMPLETED`. Check `stdout` for your output.

---

### Step 8 — Check Health & Metrics (No Token Needed)

**GET** `http://localhost:8081/actuator/health`  
**GET** `http://localhost:8081/actuator/prometheus`

---

## 7. Real-Time Features (WebSocket)

The backend pushes data to the browser over WebSocket — no polling needed for these features.

### Connection
- URL: `ws://localhost:8081/ws` (SockJS-compatible)
- Protocol: STOMP
- Managed in frontend by `WebSocketContext.jsx` — connects automatically after login, disconnects on logout

### Log Streaming
- Subscribe: `/topic/logs/{projectId}`
- Every HTTP request made to the backend (by any user) that touches `/projects/{projectId}/...` is forwarded here in real-time
- Used by: `LogsPage` — shows a live feed of `method`, `uri`, `status`, `durationMs`

### Notifications
- Subscribe: `/topic/notifications/{userId}`
- Fires when: a task is assigned to you, or you are added to a project
- Used by: `NotificationContext` (global) — shows toast + badge count in the Header

---

## 8. Observability Stack

All services run via `docker-compose up -d`.

| UI | URL | What it shows |
|---|---|---|
| **Grafana** | `http://localhost:3000` | JVM heap, GC, HTTP request rates, error rates |
| **Kibana** | `http://localhost:5601` | Full-text log explorer — every API request indexed |
| **Prometheus** | `http://localhost:9090` | Raw metrics, PromQL queries |

### Kibana Setup (first time)
1. Open `http://localhost:5601`
2. Go to **Stack Management → Data Views → Create data view**
3. Pattern: `devopssuite-logs-*`
4. Timestamp field: `timestamp`
5. Go to **Discover** — you will see real-time logs for every API call

### Grafana Setup (first time)
1. Open `http://localhost:3000` (login: `admin` / `admin`)
2. Go to **Connections → Data Sources → Add Prometheus**
3. URL: `http://prometheus:9090`
4. Import a JVM dashboard (ID `4701` from Grafana.com) for instant visibility
