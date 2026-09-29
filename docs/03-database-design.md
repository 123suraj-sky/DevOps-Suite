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

    users ||--o{ notification_preferences : has
    users ||--o{ user_follows : "follower"
    users ||--o{ user_follows : "following"

    users ||--o{ ide_files : owns
    projects ||--o{ ide_files : contains

    tasks ||--o{ task_audit_history : "audited by"
    users ||--o{ task_audit_history : "changed by"

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar display_name
        varchar_512 avatar_url
        varchar gender
        varchar oauth_provider
        varchar oauth_id
        bigint profile_view_count
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
        uuid created_by FK
        uuid last_modified_by FK
        varchar title
        text description
        varchar_20 priority
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

    notifications {
        uuid id PK
        uuid user_id FK
        varchar_50 type
        varchar_255 title
        text message
        uuid project_id FK
        uuid task_id FK
        boolean read
        timestamptz created_at
    }

    notification_preferences {
        uuid id PK
        uuid user_id FK
        varchar_50 type
        boolean in_app
        boolean email
    }

    user_follows {
        uuid follower_id FK
        uuid following_id FK
        timestamptz followed_at
    }

    ide_files {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        text path
        text name
        text content
        text language
        boolean is_folder
        timestamptz created_at
        timestamptz updated_at
    }

    task_audit_history {
        uuid id PK
        uuid task_id FK
        uuid changed_by FK
        timestamptz changed_at
        varchar_32 action
        jsonb snapshot
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
| `execution_requests` | `idx_exec_created` | `created_at` | Sorting by newest |
| `execution_requests` | `idx_exec_file` | `file_id` | IDE file execution lookup |
| `execution_results` | `idx_result_request` | `request_id` | Join to execution request |
| `notifications` | `idx_notifications_user_id` | `user_id` | User inbox queries |
| `notifications` | `idx_notifications_user_read` | `(user_id, read)` | Unread count |
| `notifications` | `idx_notifications_created_at` | `created_at DESC` | Recent notifications |
| `notification_preferences` | `idx_notif_pref_user_id` | `user_id` | Preference lookup |
| `ide_files` | `idx_ide_files_project` | `project_id` | File tree for a project |
| `ide_files` | `idx_ide_files_user` | `user_id` | Files by owner |
| `ide_files` | `idx_ide_files_proj_path` | `(project_id, path)` | Unique path enforcement |
| `task_audit_history` | `idx_task_audit_history_task_id` | `task_id` | Task history lookup |
| `task_audit_history` | `idx_task_audit_history_changed_at` | `changed_at DESC` | Recent changes |
| `user_follows` | `idx_user_follows_follower` | `follower_id` | "Who do I follow?" |
| `user_follows` | `idx_user_follows_following` | `following_id` | "Who follows me?" |

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

## 5. Additional Tables (Added in Migrations V4–V16)

### `password_reset_tokens` (V4)
Time-limited tokens for forgot-password / reset-password email flow.
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

### `ide_files` (V7)
Stores files created/edited in the IDE (file explorer + editor). Scoped per project.
```sql
CREATE TABLE IF NOT EXISTS ide_files (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID        NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    path       TEXT        NOT NULL,        -- full relative path, e.g. "src/utils.py"
    name       TEXT        NOT NULL,        -- filename only, e.g. "utils.py"
    content    TEXT        NOT NULL DEFAULT '',
    language   TEXT        NOT NULL DEFAULT 'plaintext',
    is_folder  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ide_file_path UNIQUE (project_id, path)
);
```

### `notification_preferences` (V14)
Per-user, per-notification-type opt-in for in-app and email delivery. Missing rows default to `in_app=true`, `email=false`.
```sql
CREATE TABLE notification_preferences (
    id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type    VARCHAR(50) NOT NULL,
    in_app  BOOLEAN     NOT NULL DEFAULT TRUE,
    email   BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_notif_pref_user_type UNIQUE (user_id, type)
);
```

### `task_audit_history` (V11)
Audit trail for every task create/update/status-change. `snapshot` is a full JSONB copy of the task at that point in time.
```sql
CREATE TABLE IF NOT EXISTS task_audit_history (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID         NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    changed_by UUID         REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    action     VARCHAR(32)  NOT NULL,  -- CREATED | UPDATED | STATUS_CHANGED | DUPLICATED
    snapshot   JSONB        NOT NULL
);
```

### `user_follows` (V15)
User follow relationships for social features on profiles.
```sql
CREATE TABLE user_follows (
    follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
);
```

> **Note on V6:** `users.gender` is `VARCHAR(20) NOT NULL DEFAULT 'PREFER_NOT_TO_SAY'`. Valid values: `MALE`, `FEMALE`, `NON_BINARY`, `PREFER_NOT_TO_SAY`.  
> **Note on V9:** `tasks.priority` changed from `INTEGER` to `VARCHAR(20)` (named values: `LOW`, `MEDIUM`, `HIGH`).  
> **Note on V10:** `tasks` gets `created_by UUID` and `last_modified_by UUID` (both nullable FK to `users`).  
> **Note on V13:** `users.avatar_url` is `VARCHAR(512)` (stores relative URL path like `/uploads/avatars/uuid.jpg`).  
> **Note on V15:** Also adds `profile_view_count BIGINT NOT NULL DEFAULT 0` to the `users` table.  
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
| V5 | Fix C++ Docker image reference (→ `devopssuite-cpp:latest`) |
| V6 | Add `gender VARCHAR(20)` column to users |
| V7 | Add ide_files table |
| V8 | Add `file_id UUID` FK to execution_requests |
| V9 | Change `tasks.priority` from INTEGER to VARCHAR(20) |
| V10 | Add `created_by`, `last_modified_by` audit columns to tasks |
| V11 | Add task_audit_history table (JSONB snapshot pattern) |
| V12 | Change `users.avatar_url` to TEXT |
| V13 | Revert `users.avatar_url` to VARCHAR(512), clear base64 data URIs |
| V14 | Add notification_preferences table |
| V15 | Add user_follows table + `profile_view_count BIGINT` to users |
| V16 | Add `project_id UUID` column to execution_requests |

---

## 7. Connection Pool Configuration (HikariCP)
- `maximumPoolSize`: 10 (Sufficient for moderate monolithic backend operations)
- `minimumIdle`: 5
- `connectionTimeout`: 5000ms
- `idleTimeout`: 300000ms
- `maxLifetime`: 1800000ms
