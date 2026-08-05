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
9. [Postman — Actuator / Health APIs](#9-postman--actuator--health-apis)
10. [Postman — Tips & Collection Setup](#10-postman--tips--collection-setup)
11. [Stopping Everything](#11-stopping-everything)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Install the following before running the project:

| Tool | Version | Purpose |
|---|---|---|
| **Docker Desktop** | Latest | Runs PostgreSQL, Redis, Grafana, Kibana, Prometheus |
| **Java JDK** | 21+ | Compiles and runs Spring Boot backend |
| **Apache Maven** | 3.9+ | Backend build tool |
| **Node.js** | 20+ | Frontend dev server |
| **npm** | 9+ | Frontend package manager |
| **Postman** | Any | API testing client |

> Check Docker is running before starting anything else.

---

## 2. Environment Setup

### Backend
The backend reads from `backend/src/main/resources/application.yml`. All settings have defaults for local development — no `.env` changes needed unless you're connecting to a remote DB.

Optional environment variables you can set before running:
```powershell
$env:JWT_SECRET = "my-super-secret-key-minimum-32chars-long"
$env:DB_PASSWORD = "password"          # Default: password
$env:GOOGLE_CLIENT_ID = "your-id"     # Only if using Google OAuth
$env:GOOGLE_CLIENT_SECRET = "your-secret"
```

### Frontend
The file `frontend/.env` is already configured:
```
VITE_API_BASE_URL=http://localhost:8081/api
VITE_WS_URL=ws://localhost:8081/ws
```
No changes needed for local development.

---

## 3. Starting the Stack

### Step 1 — Start the database and cache
```powershell
cd "D:\Projects\DevOps Suite"
docker-compose up -d postgres redis
```

To also start Grafana, Prometheus, Elasticsearch, Kibana:
```powershell
docker-compose up -d
```

Wait ~15 seconds for PostgreSQL to be ready.

### Step 2 — Run the backend
```powershell
cd "D:\Projects\DevOps Suite\backend"
mvn spring-boot:run
```

The backend starts on **`http://localhost:8081`**.

Watch for this line to confirm startup:
```
Started DevOpsSuiteApplication in X.XXX seconds
```

Flyway will automatically run `V1__initial_schema.sql` and create all tables on first boot.

### Step 3 — Run the frontend
```powershell
cd "D:\Projects\DevOps Suite\frontend"
npm install         # Only needed the first time
npm run dev
```

The frontend starts on **`http://localhost:5173`**.

---

## 4. User Creation Guide

### Option A — Via the Frontend (Recommended)
1. Open `http://localhost:5173` in your browser.
2. Click **Register** on the login page.
3. Enter your **Email**, **Display Name**, and **Password**.
4. Submit — you'll be automatically logged in and redirected to the dashboard.

### Option B — Via Postman (API)

**POST** `http://localhost:8081/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
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
    "created_at": "2026-08-05T16:30:00Z"
  }
}
```

---

## 5. Postman — Auth APIs

### Set Up Your Collection
1. Open Postman → **New Collection** → Name it `DevOps Suite`.
2. Go to **Variables** tab on the collection and add:
   - `base_url` = `http://localhost:8081`
   - `token` = *(leave empty for now)*

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
    "expires_in": 86400000,
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
| Field | Value |
|---|---|
| Method | `GET` |
| URL | `{{base_url}}/auth/me` |
| Authorization | Bearer Token → `{{token}}` |

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

> Copy the `id` from the response — you'll need it for boards and tasks.

---

### 6.2 List Projects
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/projects?page=0&size=10` |

---

### 6.3 Get Project by ID
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/projects/{projectId}` |

---

### 6.4 Update Project
| Method | URL |
|---|---|
| `PUT` | `{{base_url}}/api/v1/projects/{projectId}` |

**Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

---

### 6.5 Delete Project
| Method | URL |
|---|---|
| `DELETE` | `{{base_url}}/api/v1/projects/{projectId}` |

---

### 6.6 Add Member to Project
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

### 6.7 Remove Member
| Method | URL |
|---|---|
| `DELETE` | `{{base_url}}/api/v1/projects/{projectId}/members/{userId}` |

---

### 6.8 Create Board
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

### 6.9 List Boards
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/projects/{projectId}/boards` |

---

### 6.10 Create Column (in a Board)
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

### 7.2 Create Task (general)
| Method | URL |
|---|---|
| `POST` | `{{base_url}}/api/v1/tasks` |

**Body:**
```json
{
  "title": "Write unit tests",
  "description": "Cover auth service",
  "priority": "MEDIUM"
}
```

---

### 7.3 Get Task
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/tasks/{taskId}` |

---

### 7.4 Update Task
| Method | URL |
|---|---|
| `PUT` | `{{base_url}}/api/v1/tasks/{taskId}` |

**Body:**
```json
{
  "title": "Updated title",
  "description": "Updated desc",
  "priority": "LOW"
}
```

---

### 7.5 Update Task Status
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

### 7.6 Delete Task
| Method | URL |
|---|---|
| `DELETE` | `{{base_url}}/api/v1/tasks/{taskId}` |

---

### 7.7 List All Tasks in a Project
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/projects/{projectId}/tasks` |

---

### 7.8 Reorder Tasks
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

### 8.1 Submit Code for Execution
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

**Body (JavaScript/Node):**
```json
{
  "language": "javascript",
  "source_code": "console.log('Hello from Node.js!');\nconst arr = [1,2,3];\nconsole.log(arr.map(x => x * 2));",
  "max_time_ms": 5000
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

### 8.2 Poll for Execution Result
| Method | URL |
|---|---|
| `GET` | `{{base_url}}/api/v1/execute/{execution_id}` |

**Poll this endpoint every 1-2 seconds until `status` is not `QUEUED` or `RUNNING`.**

**Final Response (when complete):**
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

**Possible `status` values:**
| Status | Meaning |
|---|---|
| `QUEUED` | Waiting in the execution queue |
| `RUNNING` | Container is executing |
| `COMPLETED` | Finished successfully |
| `FAILED` | Runtime error |
| `TIMEOUT` | Exceeded `max_time_ms` |
| `OOM_KILLED` | Exceeded memory limit |

---

## 9. Postman — Actuator / Health APIs

These are public — no token required.

| Name | Method | URL |
|---|---|---|
| Health check | `GET` | `http://localhost:8081/actuator/health` |
| App info | `GET` | `http://localhost:8081/actuator/info` |
| All metrics | `GET` | `http://localhost:8081/actuator/metrics` |
| Prometheus format | `GET` | `http://localhost:8081/actuator/prometheus` |
| Specific metric | `GET` | `http://localhost:8081/actuator/metrics/jvm.memory.used` |

---

## 10. Postman — Tips & Collection Setup

### Auto-save Token After Login
In your **Login request → Tests tab**, paste:
```javascript
const json = pm.response.json();
if (json.data && json.data.access_token) {
    pm.collectionVariables.set("token", json.data.access_token);
    console.log("Token saved:", json.data.access_token.substring(0, 20) + "...");
}
```

### Auto-save Project ID
In your **Create Project request → Tests tab**, paste:
```javascript
const json = pm.response.json();
if (json.data && json.data.id) {
    pm.collectionVariables.set("projectId", json.data.id);
}
```

### Set Authorization on the Collection
1. Go to your **DevOps Suite** collection → **Authorization** tab.
2. Type: **Bearer Token**
3. Token: `{{token}}`

This way every request in the collection automatically uses the token without setting it per-request.

### Common HTTP Status Codes
| Code | Meaning |
|---|---|
| `200 OK` | Success |
| `201 Created` | Resource created |
| `202 Accepted` | Async task accepted (e.g., code submission) |
| `400 Bad Request` | Validation error — check your JSON body |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Token valid but not authorized for this resource |
| `404 Not Found` | Resource doesn't exist |
| `409 Conflict` | Duplicate resource (e.g., email already registered) |

---

## 11. Stopping Everything

```powershell
# Stop Docker containers (keeps data)
docker-compose down

# Stop and wipe all data (fresh start)
docker-compose down -v

# Kill backend: Ctrl+C in the terminal running mvn spring-boot:run
# Kill frontend: Ctrl+C in the terminal running npm run dev
```

---

## 12. Troubleshooting

### Backend won't start
- **"Connection refused" to PostgreSQL** — Run `docker-compose up -d postgres` first and wait 15 seconds.
- **"Could not validate token"** — Check `JWT_SECRET` matches if you changed it.
- **Port 8081 already in use** — Find and kill the process using the port.

### Flyway migration error on startup
- The schema might be partially applied. Try: `docker-compose down -v` then `docker-compose up -d postgres` to reset the database volume.

### 401 Unauthorized in Postman
- Token may have expired (24h TTL). Re-run the Login request to get a fresh token.
- Ensure the `Authorization` header is set to `Bearer {{token}}` and the collection variable is populated.

### Frontend shows blank / no data
- Confirm the backend is running on port `8081`.
- Check browser DevTools → Network tab for failed API calls.
- Confirm `frontend/.env` contains `VITE_API_BASE_URL=http://localhost:8081/api`.

### Code execution times out
- Ensure Docker Desktop is running.
- The Python/Node docker images need to be pulled on first run. This may take a minute.
