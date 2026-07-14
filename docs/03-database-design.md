# Database Design - DevOps Suite

## 1. Overview

Each microservice owns its own PostgreSQL database (database-per-service pattern). This document describes the schema for each service.

---

## 2. Auth Service Database (auth_db)

### 2.1 Entity-Relationship Diagram

``` mermaid
erDiagram
    users ||--o{ user_roles : has
    roles ||--o{ user_roles : assigned_to
    users ||--o{ refresh_tokens : owns

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar display_name
        varchar avatar_url
        varchar oauth_provider
        varchar oauth_id
        timestamptz created_at
        timestamptz updated_at
        timestamptz last_login_at
    }

    roles {
        uuid id PK
        varchar name UK
        varchar description
        timestamptz created_at
    }

    user_roles {
        uuid user_id FK
        uuid role_id FK
        timestamptz assigned_at
    }

    refresh_tokens {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz created_at
        boolean revoked
    }
```

### 2.2 Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| users | idx_users_email | email | Fast login lookup |
| refresh_tokens | idx_refresh_token_hash | token_hash | Token validation |
| refresh_tokens | idx_refresh_user | user_id | List/revoke user tokens |
| user_roles | idx_user_roles_user | user_id | Role lookup |
| user_roles | idx_user_roles_role | role_id | Role membership |

---

## 3. Project Management Service Database (project_db)

### 3.1 Entity-Relationship Diagram

``` mermaid
erDiagram
    projects ||--o{ boards : contains
    boards ||--o{ columns : contains
    columns ||--o{ tasks : contains
    users ||--o{ tasks : assigned_to
    projects ||--o{ project_members : has
    users ||--o{ project_members : member_of

    projects {
        uuid id PK
        varchar name
        text description
        uuid owner_id FK
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    project_members {
        uuid project_id FK
        uuid user_id FK
        varchar role
        timestamptz joined_at
    }

    boards {
        uuid id PK
        uuid project_id FK
        varchar name
        text description
        int sort_order
        timestamptz created_at
        timestamptz updated_at
    }

    columns {
        uuid id PK
        uuid board_id FK
        varchar name
        varchar color_hex
        int sort_order
        int wip_limit
        timestamptz created_at
        timestamptz updated_at
    }

    tasks {
        uuid id PK
        uuid column_id FK
        uuid assignee_id FK
        varchar title
        text description
        int priority
        varchar status
        date due_date
        int sort_order
        timestamptz created_at
        timestamptz updated_at
    }
```

### 3.2 Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| projects | idx_projects_owner | owner_id | Users projects |
| project_members | idx_proj_member_user | user_id | Projects a user belongs to |
| project_members | idx_proj_member_project | project_id | Members of project |
| boards | idx_boards_project | project_id | Boards per project |
| columns | idx_columns_board | board_id | Columns per board |
| tasks | idx_tasks_column | column_id | Tasks per column |
| tasks | idx_tasks_assignee | assignee_id | Tasks assigned to user |

---

## 4. Code Execution Service Database (code_exec_db)

### 4.1 Entity-Relationship Diagram

``` mermaid
erDiagram
    execution_requests ||--o{ execution_results : produces
    users ||--o{ execution_requests : submits
    languages ||--o{ execution_requests : uses

    languages {
        uuid id PK
        varchar name UK
        varchar version
        varchar docker_image
        varchar file_extension
        int max_execution_time_ms
        int max_memory_mb
        boolean enabled
        timestamptz created_at
    }

    execution_requests {
        uuid id PK
        uuid user_id FK
        uuid language_id FK
        text source_code
        text stdin
        int max_time_ms
        int max_memory_mb
        varchar status
        timestamptz created_at
        timestamptz started_at
        timestamptz completed_at
    }

    execution_results {
        uuid id PK
        uuid request_id FK UK
        text stdout
        text stderr
        int exit_code
        int execution_time_ms
        int memory_used_kb
        boolean timed_out
        boolean oom_killed
        timestamptz created_at
    }
```

### 4.2 Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| execution_requests | idx_exec_user | user_id | User execution history |
| execution_requests | idx_exec_status | status | Filter by status |
| execution_requests | idx_exec_created | created_at | Time-based queries |
| execution_results | idx_result_request | request_id | Fast result lookup |

---

## 5. Logging Service Database (logs_db)

### 5.1 Entity-Relationship Diagram

``` mermaid
erDiagram
    log_entries ||--o{ log_metadata : has

    log_entries {
        uuid id PK
        varchar service_name
        varchar level
        varchar http_method
        varchar http_path
        int http_status
        uuid user_id
        varchar message
        int duration_ms
        varchar ip_address
        varchar user_agent
        jsonb additional_context
        timestamptz timestamp
    }

    log_metadata {
        uuid id PK
        uuid log_entry_id FK
        varchar key
        text value
    }
```

> Note: In production, logs are shipped to Elasticsearch for full-text search and Kibana dashboards. PostgreSQL serves as primary durable store.

### 5.2 Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| log_entries | idx_log_service | service_name | Filter by service |
| log_entries | idx_log_level | level | Filter by severity |
| log_entries | idx_log_timestamp | timestamp | Time-range queries |
| log_entries | idx_log_user | user_id | User activity audit |
| log_entries | idx_log_status | http_status | Error rate analysis |

---

## 6. Metrics Service Database (metrics_db)

### 6.1 Entity-Relationship Diagram

``` mermaid
erDiagram
    metrics_snapshots ||--o{ metric_data_points : contains

    metrics_snapshots {
        uuid id PK
        varchar service_name
        varchar endpoint
        timestamptz snapshot_time
        int request_count
        int error_count
        float avg_response_time_ms
        float p50_response_time_ms
        float p95_response_time_ms
        float p99_response_time_ms
        int active_connections
        float cpu_usage_percent
        float memory_usage_mb
    }

    metric_data_points {
        uuid id PK
        uuid snapshot_id FK
        varchar metric_name
        float metric_value
        jsonb labels
        timestamptz recorded_at
    }
```

### 6.2 Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| metrics_snapshots | idx_metric_service | service_name | Per-service metrics |
| metrics_snapshots | idx_metric_time | snapshot_time | Time-series queries |
| metric_data_points | idx_datapoint_snapshot | snapshot_id | Data per snapshot |

---

## 7. Migration Strategy

``` mermaid
flowchart LR
    V1[V1__initial_schema.sql] --> V2[V2__add_indexes.sql]
    V2 --> V3[V3__add_columns.sql]
    V3 --> VN[Vn__...]
```

- Each migration is a numbered SQL file in src/main/resources/db/migration/
- Migrations are applied in order; never modify an already-applied migration
- Rollbacks are written as separate V{n}__undo_*.sql for critical migrations
- All migrations are tested against a fresh database in CI

---

## 8. Connection Pool Configuration (HikariCP)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| maximumPoolSize | 10 | Sufficient for moderate load |
| minimumIdle | 2 | Keep warm connections ready |
| connectionTimeout | 5000ms | Fail fast if DB is down |
| idleTimeout | 300000ms | 5 minutes idle before close |
| maxLifetime | 1800000ms | 30 minutes max connection lifetime |

---

## 9. Data Consistency & Transactions

- Each service uses @Transactional for operations spanning multiple tables
- Cross-service consistency via eventual consistency through Kafka events (Phase 4+)
- For MVP, REST calls with idempotency keys suffice

## 9. Notification Entity

The notification entity stores user notifications generated by events across the system.

### 9.1 Schema Definition

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 9.2 Indexes

```sql
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_project_id ON notifications(project_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### 9.3 Key Queries

- Get user notifications (paginated): WHERE user_id = ? ORDER BY created_at DESC
- Get unread count: SELECT COUNT(*) WHERE user_id = ? AND read = false
- Mark as read: UPDATE notifications SET read = true WHERE id = ? AND user_id = ?
- Mark all as read: UPDATE notifications SET read = true WHERE user_id = ?

## 10. Log Entry Entity

The log entry entity stores structured log data. Logs are dual-written to PostgreSQL and Elasticsearch.

### 10.1 Schema Definition

```sql
CREATE TABLE log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    service_name VARCHAR(100) NOT NULL,
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    trace_id VARCHAR(100),
    span_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 10.2 Indexes

```sql
CREATE INDEX idx_log_entries_project_id ON log_entries(project_id);
CREATE INDEX idx_log_entries_task_id ON log_entries(task_id);
CREATE INDEX idx_log_entries_level ON log_entries(level);
CREATE INDEX idx_log_entries_trace_id ON log_entries(trace_id);
CREATE INDEX idx_log_entries_timestamp ON log_entries(timestamp DESC);
```

### 10.3 Key Queries

- Get logs by project: WHERE project_id = ? ORDER BY timestamp DESC
- Get logs by task: WHERE task_id = ? ORDER BY timestamp DESC
- Get logs by level: WHERE project_id = ? AND level = ?
- Full-text search: Elasticsearch query on message field
