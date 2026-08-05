# Security Design - DevOps Suite

## 1. Overview
Multi-layer security: transport, authentication, authorization, input validation, and runtime sandboxing are managed within the monolithic Spring Boot application.

---

## 2. Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant MN as Monolith (Security Filter)
    participant DB as Database

    C->>MN: POST /api/auth/login
    MN->>DB: Validate credentials
    DB-->>MN: User found
    MN->>MN: Generate JWT (access + refresh)
    MN-->>C: 200 OK with tokens

    Note over C,MN: Subsequent requests
    C->>MN: GET /api/v1/projects with Bearer token
    MN->>MN: Intercept & Validate Token
    MN->>MN: Establish Security Context
    MN->>MN: Execute Controller logic
    MN-->>C: Response
```

---

## 3. JWT Token Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Active : Generated
    Active --> Expired : 1 hour (access)
    Active --> Expired : 7 days (refresh)
    Active --> Revoked : User logout
    Active --> Revoked : Password change
    Expired --> [*]
    Revoked --> [*]
```

---

## 4. Role-Based Access Control (RBAC)

### Role Hierarchy
```mermaid
flowchart TD
    OWNER --> ADMIN
    ADMIN --> MEMBER
    MEMBER --> VIEWER
    VIEWER --> NONE
```

### Permission Matrix

| Action | OWNER | ADMIN | MEMBER | VIEWER |
|---|---|---|---|---|
| View project | Yes | Yes | Yes | Yes |
| Create task | Yes | Yes | Yes | No |
| Edit task | Yes | Yes | Yes | No |
| Delete task | Yes | Yes | Own only | No |
| Manage columns | Yes | Yes | No | No |
| Add/remove members | Yes | Yes | No | No |
| Delete project | Yes | No | No | No |

---

## 5. Password Policy

| Requirement | Rule |
|---|---|
| Minimum length | 8 characters |
| Complexity | 1 upper, 1 lower, 1 digit, 1 special |
| Hash algorithm | BCrypt (cost 12) |

---

## 6. API Security - Rate Limiting

```mermaid
flowchart TD
    A[Request] --> B{Rate limit check}
    B -->|Under limit| C[Process request]
    B -->|Over limit| D[Return 429]
    C --> E[Increment counter in Redis]
    E --> F[Return response]
```

---

## 7. Code Execution Sandbox

```mermaid
flowchart TD
    A[Source Code] --> B[Write to temp file]
    B --> C[Create Docker container]
    C --> D[Apply security profile]
    D --> E[No network]
    D --> F[Read-only FS]
    D --> G[Dropped capabilities]
    D --> H[Seccomp]
    D --> I[Memory: 256MB]
    D --> J[CPU: 1 core]
    D --> K[Timeout: 30s]
    E --> L[Execute code]
    F --> L
    G --> L
    H --> L
    I --> L
    J --> L
    K --> L
    L --> M[Capture output]
    M --> N[Destroy container]
    N --> O[Return result]
```

---

## 8. Secrets Management
- All secrets are loaded from environment variables (e.g. `JWT_SECRET`, `DB_PASSWORD`, `GOOGLE_CLIENT_ID`).
- Safe fallback defaults are configured for development.

---

## 9. Security Headers
- `Strict-Transport-Security`: Enforces HTTPS.
- `X-Content-Type-Options`: nosniff.
- `X-Frame-Options`: DENY to prevent clickjacking.
- `Content-Security-Policy`: default-src 'self'.

---

## 10. Audit Logging
- Auth attempts, CRUD actions, and code executions are logged synchronously or asynchronously to the logging database and indexed to Elasticsearch.
