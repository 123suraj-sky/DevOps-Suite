# API Design & Contracts - DevOps Suite

## 1. Overview

All services expose RESTful APIs over HTTP/2. API Gateway routes requests to appropriate microservices. All responses use JSON. Authentication is via JWT Bearer tokens.

---

## 2. API Gateway Routes

 mermaid
flowchart LR
    Client[Client] --> GW[API Gateway :8080]
    GW --> Auth[Auth Service :8081]
    GW --> Project[Project Service :8082]
    GW --> CodeExec[Code Exec Service :8083]
    GW --> Logs[Logging Service :8084]
    GW --> Metrics[Metrics Service :8085]


---

## 3. Auth Service API

### 3.1 Register User


POST /api/v1/auth/register


**Request Body:**
 json
{
    "email": "user@example.com",
    "password": "securePass123!",
    "display_name": "John Doe"
}


**Response (201):**
 json
{
    "user_id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "created_at": "2025-01-01T00:00:00Z"
}


**Errors:**
| Code | Message |
|------|---------|
| 400 | Invalid email format |
| 409 | Email already registered |
| 422 | Password too weak |

### 3.2 Login


POST /api/v1/auth/login


**Request Body:**
 json
{
    "email": "user@example.com",
    "password": "securePass123!"
}


**Response (200):**
 json
{
    "access_token": "eyJhbG...",
    "refresh_token": "dGhpcyBp...",
    "expires_in": 3600,
    "token_type": "Bearer"
}


### 3.3 Refresh Token


POST /api/v1/auth/refresh


**Request Body:**
 json
{
    "refresh_token": "dGhpcyBp..."
}


**Response (200):**
 json
{
    "access_token": "eyJhbG...",
    "expires_in": 3600
}


### 3.4 Get Current User


GET /api/v1/auth/me
Authorization: Bearer


**Response (200):**
 json
{
    "user_id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "roles": ["MEMBER"],
    "created_at": "2025-01-01T00:00:00Z"
}


---

## 4. Project Management Service API

### 4.1 Create Project


POST /api/v1/projects
Authorization: Bearer <token>


**Request Body:**
 json
{
    "name": "My Project",
    "description": "A sample project"
}


**Response (201):**
 json
{
    "project_id": "uuid",
    "name": "My Project",
    "owner_id": "uuid",
    "status": "ACTIVE",
    "created_at": "2025-01-01T00:00:00Z"
}


### 4.2 List Projects


GET /api/v1/projects?page=1&size=20
Authorization: Bearer <token>


**Response (200):**
 json
{
    "projects": [
        {
            "project_id": "uuid",
            "name": "My Project",
            "status": "ACTIVE",
            "member_count": 3
        }
    ],
    "total": 1,
    "page": 1,
    "size": 20
}


### 4.3 Create Board


POST /api/v1/projects/{project_id}/boards
Authorization: Bearer <token>


### 4.4 Create Task


POST /api/v1/boards/{board_id}/tasks
Authorization: Bearer <token>


---

## 5. Code Execution Service API

### 5.1 Execute Code


POST /api/v1/execute
Authorization: Bearer <token>


**Request Body:**
 json
{
    "language": "python",
    "version": "3.12",
    "source_code": "print('Hello World')",
    "stdin": "",
    "max_time_ms": 5000,
    "max_memory_mb": 256
}


**Response (202):**
 json
{
    "execution_id": "uuid",
    "status": "PENDING"
}


### 5.2 Get Execution Result


GET /api/v1/execute/{execution_id}
Authorization: Bearer <token>


**Response (200):**
 json
{
    "execution_id": "uuid",
    "status": "COMPLETED",
    "stdout": "Hello World\n",
    "stderr": "",
    "exit_code": 0,
    "execution_time_ms": 45,
    "memory_used_kb": 10240
}


---

## 6. Logging Service API

### 6.1 Query Logs


GET /api/v1/logs?service=auth&level=ERROR&from=2025-01-01T00:00:00Z&to=2025-01-02T00:00:00Z&page=1&size=50
Authorization: Bearer <token>


**Response (200):**
 json
{
    "logs": [
        {
            "id": "uuid",
            "service_name": "auth",
            "level": "ERROR",
            "message": "Invalid login attempt",
            "timestamp": "2025-01-01T12:00:00Z"
        }
    ],
    "total": 1
}


---

## 7. Metrics Service API

### 7.1 Get Service Metrics


GET /api/v1/metrics/{service_name}?from=2025-01-01T00:00:00Z&to=2025-01-02T00:00:00Z
Authorization: Bearer <token>


**Response (200):**
 json
{
    "service_name": "auth",
    "period": {
        "from": "2025-01-01T00:00:00Z",
        "to": "2025-01-02T00:00:00Z"
    },
    "metrics": [
        {
            "timestamp": "2025-01-01T12:00:00Z",
            "request_count": 150,
            "error_count": 3,
            "avg_response_time_ms": 45.2,
            "p95_response_time_ms": 120.0
        }
    ]
}


---

## 8. Error Response Format

 json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid request parameters",
        "details": [
            {
                "field": "email",
                "message": "Must be a valid email address"
            }
        ],
        "request_id": "uuid",
        "timestamp": "2025-01-01T00:00:00Z"
    }
}


### Common Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request body/params |
| 401 | UNAUTHORIZED | Missing/invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 422 | UNPROCESSABLE_ENTITY | Business rule violation |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

---

## 9. Rate Limiting

- Per-user: 100 requests/minute
- Per-IP: 1000 requests/minute
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- Response on limit: 429 with Retry-After header

---

## 10. API Versioning

- Version embedded in URL path: /api/v1/...
- Backward-compatible changes: no version bump
- Breaking changes: /api/v2/...
- Deprecated endpoints return Sunset header with migration URL

## 8. Notification Service API

Base URL: /api/notifications

### 8.1 Get User Notifications

- **GET** /api/notifications
- Headers: Authorization Bearer token
- Query: page int, size int, unreadOnly boolean
- Response 200: Paginated NotificationResponse

### 8.2 Get Unread Count

- **GET** /api/notifications/unread-count
- Response 200: count int

### 8.3 Mark as Read

- **PUT** /api/notifications/{notificationId}/read
- Response 204: No content
- Error 404: Notification not found

### 8.4 Mark All as Read

- **PUT** /api/notifications/read-all
- Response 204: No content

### 8.5 Delete Notification

- **DELETE** /api/notifications/{notificationId}
- Response 204: No content

## 9. WebSocket STOMP Endpoints

WebSocket URL: /ws
Protocol: STOMP over SockJS

### 9.1 Subscribe Destinations

| Destination | Purpose | Payload |
|---|---|---|
| /topic/notifications/{userId} | User notifications | NotificationResponse |
| /topic/logs/{projectId} | Log streaming | LogEntryResponse |
| /topic/tasks/{projectId} | Task updates | TaskUpdateEvent |
| /topic/execution/{taskId} | Execution status | ExecutionStatusEvent |

### 9.2 Error Handling

| Scenario | STOMP Error |
|---|---|
| Invalid JWT token | ERROR: Authentication failed |
| Expired token | ERROR: Token expired |
| Invalid destination | SUBSCRIPTION ERROR |

## 10. Logging Service API

Base URL: /api/logs

### 10.1 Search Logs

- **GET** /api/logs/search
- Query: projectId required, taskId, level, query, startTime, endTime, page, size
- Response 200: Paginated LogEntryResponse

### 10.2 Get Logs by Project

- **GET** /api/logs/project/{projectId}
- Response 200: Paginated LogEntryResponse

### 10.3 Get Logs by Task

- **GET** /api/logs/task/{taskId}
- Response 200: Paginated LogEntryResponse

### 10.4 Get Log by ID

- **GET** /api/logs/{logId}
- Response 200: LogEntryResponse
- Error 404: Log entry not found
