# Database Design - DevOps Suite

## 1. Overview
The DevOps Suite application uses a consolidated PostgreSQL database (`devopssuite`). This single database design enables strong transactional guarantees, foreign key relations across domains, and simplified schema migrations.

---

## 2. Monolithic Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ user_roles : has
    roles ||--o{ user_roles : assigned_to
    
    users ||--o{ projects : owns
    projects ||--o{ project_members : has
    users ||--o{ project_members : member_of

    projects ||--o{ boards : contains
    boards ||--o{ columns : contains
    columns ||--o{ tasks : contains
    users ||--o{ tasks : assigned_to

    users ||--o{ execution_requests : submits
    languages ||--o{ execution_requests : uses
    execution_requests ||--o{ execution_results : produces

    users ||--o{ notifications : receives
    projects ||--o{ notifications : references
    tasks ||--o{ notifications : references

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
    }

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

---

## 3. Database Indexes

| Table | Index | Columns | Purpose |
|---|---|---|---|
| `users` | `idx_users_email` | `email` | Fast authentication queries |
| `projects` | `idx_projects_owner` | `owner_id` | User dashboard project lookup |
| `project_members` | `idx_proj_member_user` | `user_id` | Fetching projects a user belongs to |
| `project_members` | `idx_proj_member_project` | `project_id` | Fetching members in a project |
| `boards` | `idx_boards_project` | `project_id` | Displaying boards for a project |
| `columns` | `idx_columns_board` | `board_id` | Rendering columns in a board |
| `tasks` | `idx_tasks_column` | `column_id` | Listing tasks in a column |
| `tasks` | `idx_tasks_assignee` | `assignee_id` | Fetching tasks assigned to a user |
| `execution_requests` | `idx_exec_user` | `user_id` | Execution history queries |
| `execution_requests` | `idx_exec_status` | `status` | Worker polling / management queries |

---

## 4. Notifications Entity Schema

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

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

---

## 5. Additional Tables (Added in Migrations V7–V16)

### `ide_files` (V7)
Stores files created/edited in the full IDE (file explorer + editor).
```sql
CREATE TABLE ide_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    content TEXT,
    language VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### `password_reset_tokens` (V4)
Time-limited tokens for forgot-password / reset-password email flow.
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### `notification_preferences` (V14)
Per-user, per-notification-type opt-in for in-app and email delivery.
```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (user_id, notification_type)
);
```

### `task_audit_history` (V11)
Audit trail for task field changes (who changed what, when).
```sql
CREATE TABLE task_audit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id),
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### `user_follows` (V15)
User follow relationships for social features on profiles.
```sql
CREATE TABLE user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);
```

> **Note on V15:** Also adds `profile_view_count INTEGER DEFAULT 0` to the `users` table.  
> **Note on V9:** `task.priority` column changed from `INT` to `TEXT` to support named priority levels (LOW, MEDIUM, HIGH, CRITICAL).  
> **Note on V16:** `execution_requests` gets a `project_id UUID` column for WebSocket log routing.

---

## 6. Migration Strategy

All database migrations are handled via **Flyway** (16 migrations, V1–V16). Files are in `backend/src/main/resources/db/migration/`.

| Version | Description |
|---|---|
| V1 | Initial schema (users, roles, projects, boards, columns, tasks, languages, execution_requests, execution_results) |
| V2 | Add Java 21 and C++ language entries |
| V3 | Add notifications table |
| V4 | Add password_reset_tokens table |
| V5 | Fix C++ Docker image reference |
| V6 | Add gender column to users |
| V7 | Add ide_files table |
| V8 | Add file_id FK to execution_requests |
| V9 | Change task priority column from INT to TEXT |
| V10 | Add audit fields to tasks (created_by, updated_by) |
| V11 | Add task_audit_history table |
| V12 | Change avatar_url to TEXT type |
| V13 | Change avatar_url to VARCHAR type |
| V14 | Add notification_preferences table |
| V15 | Add user_follows table and profile_view_count to users |
| V16 | Add project_id column to execution_requests |

---

## 7. Connection Pool Configuration (HikariCP)
- `maximumPoolSize`: 10 (Sufficient for moderate monolithic backend operations)
- `minimumIdle`: 5
- `connectionTimeout`: 5000ms
- `idleTimeout`: 300000ms
- `maxLifetime`: 1800000ms
