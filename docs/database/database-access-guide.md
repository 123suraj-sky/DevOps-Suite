# Database Access Guide

How to connect to the PostgreSQL database running inside Docker and run queries.

---

## Prerequisites

The database runs as a Docker container. Make sure it is running before connecting:

```bash
docker ps --filter name=devopssuite-postgres
```

If not running, start it:

```bash
docker-compose up -d postgres
```

---

## Connect to the Database

### Option 1 — Interactive psql shell (recommended)

```bash
docker exec -it devopssuite-postgres psql -U postgres -d devopssuite
```

You will get a prompt like:

```
devopssuite=#
```

Type `\q` to exit.

---

### Option 2 — Run a single query without entering the shell

```bash
docker exec devopssuite-postgres psql -U postgres -d devopssuite -c "YOUR SQL HERE"
```

Example:

```bash
docker exec devopssuite-postgres psql -U postgres -d devopssuite -c "SELECT email, display_name FROM users;"
```

> **Note:** On Windows PowerShell, use double quotes around the SQL.
> On Linux/macOS, use single quotes.

---

## Connection Details

| Parameter | Value |
|---|---|
| Container name | `devopssuite-postgres` |
| Username | `postgres` |
| Database | `devopssuite` |
| Port (host) | `5432` |
| Port (container) | `5432` |

---

## Useful psql Meta-Commands (inside the shell)

| Command | What it does |
|---|---|
| `\dt` | List all tables |
| `\d tablename` | Describe a table (columns, types, constraints) |
| `\l` | List all databases |
| `\dn` | List all schemas |
| `\du` | List all roles/users |
| `\x` | Toggle expanded output (useful for wide rows) |
| `\q` | Quit psql |
| `\timing` | Show query execution time |

---

## All Tables in the `devopssuite` Database

These are the 14 tables created by Flyway migrations:

| Table | Purpose |
|---|---|
| `users` | Registered user accounts |
| `roles` | Role definitions (`ROLE_MEMBER`, `ROLE_ADMIN`, `ROLE_OWNER`, etc.) |
| `user_roles` | Many-to-many join: which roles a user has |
| `projects` | Projects created by users |
| `project_members` | Members of each project and their role |
| `boards` | Kanban boards inside a project |
| `columns` | Columns inside a Kanban board (e.g. To Do, In Progress, Done) |
| `tasks` | Individual Kanban tasks inside a column |
| `execution_requests` | Code execution job requests |
| `execution_results` | Output/results of code executions |
| `languages` | Supported programming languages for the code runner |
| `notifications` | In-app notifications per user |
| `password_reset_tokens` | Tokens issued for password reset flows |
| `flyway_schema_history` | Flyway migration version history (do not modify) |

---

## Basic SELECT Queries

### View all users
```sql
SELECT id, email, display_name, created_at FROM users;
```

### View a specific user by email
```sql
SELECT * FROM users WHERE email = 'suraj@gmail.com';
```

### View all roles
```sql
SELECT * FROM roles;
```

### View which roles a user has
```sql
SELECT u.email, r.name AS role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id;
```

### View all projects
```sql
SELECT id, name, description, created_at FROM projects;
```

### View project members and their roles
```sql
SELECT u.email, p.name AS project, pm.role
FROM project_members pm
JOIN users u ON u.id = pm.user_id
JOIN projects p ON p.id = pm.project_id;
```

### View all tasks across all boards
```sql
SELECT t.title, t.status, t.priority, u.email AS assignee
FROM tasks t
LEFT JOIN users u ON u.id = t.assignee_id;
```

### View supported languages for code execution
```sql
SELECT * FROM languages;
```

### View recent code executions
```sql
SELECT er.id, u.email, er.language, er.status, er.created_at
FROM execution_requests er
JOIN users u ON u.id = er.user_id
ORDER BY er.created_at DESC
LIMIT 10;
```

### View Flyway migration history
```sql
SELECT version, description, installed_on, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

---

## Describe a Table (see its columns)

```bash
docker exec devopssuite-postgres psql -U postgres -d devopssuite -c "\d users"
```

Or inside psql shell:

```sql
\d users
\d tasks
\d execution_requests
```

---

## Expanded Output for Wide Tables

If a table has many columns, enable expanded output so each row prints vertically:

```sql
\x
SELECT * FROM users LIMIT 1;
\x
```

---

## Update display_name for a User (if NULL)

If a user was created without a name, fix it directly:

```sql
UPDATE users
SET display_name = 'Suraj Kumar'
WHERE email = 'suraj@gmail.com';
```

---

## Useful One-liners (without entering the shell)

```bash
# List all tables
docker exec devopssuite-postgres psql -U postgres -d devopssuite -c "\dt"

# Count rows in a table
docker exec devopssuite-postgres psql -U postgres -d devopssuite -c "SELECT COUNT(*) FROM users;"

# Check all users and their display names
docker exec devopssuite-postgres psql -U postgres -d devopssuite -c "SELECT email, display_name FROM users;"

# Check Flyway migration history
docker exec devopssuite-postgres psql -U postgres -d devopssuite -c "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;"
```
