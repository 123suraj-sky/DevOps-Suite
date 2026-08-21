-- 1. Users and Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url VARCHAR(255),
    oauth_provider VARCHAR(255),
    oauth_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 2. Projects, Boards, Columns, Tasks
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(255) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS columns (
    id UUID PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color_hex VARCHAR(255),
    sort_order INTEGER NOT NULL,
    wip_limit INTEGER,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY,
    column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER,
    status VARCHAR(255) NOT NULL,
    due_date DATE,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_proj_member_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_proj_member_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);
CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

-- 3. Code Execution Languages and Requests
CREATE TABLE IF NOT EXISTS languages (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    version VARCHAR(20) NOT NULL,
    docker_image VARCHAR(100) NOT NULL,
    file_extension VARCHAR(10) NOT NULL,
    max_execution_time_ms INT NOT NULL DEFAULT 5000,
    max_memory_mb INT NOT NULL DEFAULT 256,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS execution_requests (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
    source_code TEXT NOT NULL,
    stdin TEXT,
    max_time_ms INT NOT NULL,
    max_memory_mb INT NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS execution_results (
    id UUID PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES execution_requests(id) ON DELETE CASCADE UNIQUE,
    stdout TEXT,
    stderr TEXT,
    exit_code INT,
    execution_time_ms INT,
    memory_used_kb INT,
    timed_out BOOLEAN NOT NULL DEFAULT FALSE,
    oom_killed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exec_user ON execution_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_exec_status ON execution_requests(status);
CREATE INDEX IF NOT EXISTS idx_exec_created ON execution_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_result_request ON execution_results(request_id);

-- Pre-populate supported languages
INSERT INTO languages (id, name, version, docker_image, file_extension, max_execution_time_ms, max_memory_mb, enabled)
VALUES 
('11111111-1111-1111-1111-111111111111', 'python', '3.12', 'python:3.12-alpine', 'py', 5000, 256, true),
('22222222-2222-2222-2222-222222222222', 'javascript', '24', 'node:24-alpine', 'js', 5000, 256, true)
ON CONFLICT (name) DO NOTHING;
