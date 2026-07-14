# Security Design - DevOps Suite

## 1. Overview

Multi-layer security: transport, authentication, authorization, input validation, and runtime sandboxing.

---

## 2. Authentication Flow

``` mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant AS as Auth Service
    participant DB as Database

    C->>GW: POST /auth/login
    GW->>AS: Forward request
    AS->>DB: Validate credentials
    DB-->>AS: User found
    AS->>AS: Generate JWT (access + refresh)
    AS-->>GW: tokens
    GW-->>C: 200 OK with tokens

    Note over C,GW: Subsequent requests
    C->>GW: GET /projects with Bearer token
    GW->>AS: Validate token
    AS-->>GW: User claims
    GW->>Project: Forward with user context
    Project-->>GW: Response
    GW-->>C: Response
```

---

## 3. JWT Token Lifecycle

``` mermaid
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

### 4.1 Role Hierarchy

``` mermaid
flowchart TD
    OWNER --> ADMIN
    ADMIN --> MEMBER
    MEMBER --> VIEWER
    VIEWER --> NONE
```

### 4.2 Permission Matrix

| Action | OWNER | ADMIN | MEMBER | VIEWER |
|--------|-------|-------|--------|--------|
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
|-------------|------|
| Minimum length | 8 characters |
| Complexity | 1 upper, 1 lower, 1 digit, 1 special |
| Hash algorithm | BCrypt (cost 12) |
| Max login attempts | 5 before 15-min lockout |
| Password history | Last 5 remembered |

---

## 6. API Security - Rate Limiting

``` mermaid
flowchart TD
    A[Request] --> B{Rate limit check}
    B -->|Under limit| C[Process request]
    B -->|Over limit| D[Return 429]
    C --> E[Increment counter]
    E --> F[Return response with headers]
```

---

## 7. Code Execution Sandbox

``` mermaid
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

- All secrets in environment variables
- Production via HashiCorp Vault
- DB passwords rotated every 90 days
- JWT keys rotated every 30 days

---

## 9. Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Enforce HTTPS |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| Content-Security-Policy | default-src 'self' | Prevent XSS |
| Cache-Control | no-store | Prevent caching |

---

## 10. Audit Logging

- All auth attempts logged
- All CRUD operations logged
- All code executions logged
- Logs immutable and append-only
- Retained for 90 days minimum
