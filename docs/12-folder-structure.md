# Project Folder Structure

## Root
- `backend/` - Monolithic Spring Boot backend
- `frontend/` - React 18 SPA frontend (JavaScript/JSX + Vite + Tailwind CSS)
- `config/` - External configuration files (nginx, Kibana auto-provisioning, Prometheus)
- `docs/` - System architecture and lifecycle documentation
- `scripts/` - Helper scripts
- `.github/workflows/` - GitHub Actions CI/CD pipeline

---

## Backend - Monolithic Package Structure
All Java sources reside inside `backend/src/main/java/com/devopssuite/`:

- `auth/` - Authentication (registration, login, JWT, Google OAuth2, GitHub OAuth2, password reset), user profile, user follow/social, admin user management.
  - `controller/AuthController.java` — auth endpoints
  - `controller/UserController.java` — public user profiles + social (follow/unfollow/followers/following)
  - `controller/AdminUserController.java` — admin user management (ROLE_ADMIN/OWNER only)
- `project/` - Project, Board, Column, and Task entities, controllers, and services (Kanban updates, WIP limits, task audit history).
- `execution/` - Sandboxed Docker code executor, ephemeral container management, activity heatmap.
- `ide/` - IDE file persistence API (CRUD for project-scoped files and folders).
- `logging/` - HTTP request logging filter, Elasticsearch ingestion pipeline, log search service.
- `metrics/` - Dashboard and user-summary metrics controllers, Prometheus/Actuator config.
- `notification/` - In-app + email notification dispatching via Spring Events; notification preferences.
- `security/` - Spring Security config, `JwtRequestFilter`, `StompAuthChannelInterceptor`, `RateLimitFilter`, CORS config.
- `config/` - WebSocket config, Redis cache service, CORS, `DataSeeder`.
- `DevOpsSuiteApplication.java` - Application entry point.

### Resources
- `backend/src/main/resources/application.yml` - Central configuration file (internal port `8081`; host-mapped to `8082` via Docker).
- `backend/src/main/resources/db/migration/` - Flyway migrations V1–V16:
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
  | V9 | Change task priority column from INT to VARCHAR(20) |
  | V10 | Add audit fields to tasks (created_by, last_modified_by) |
  | V11 | Add task_audit_history table |
  | V12 | Change avatar_url to TEXT type |
  | V13 | Change avatar_url back to VARCHAR(512) |
  | V14 | Add notification_preferences table |
  | V15 | Add user_follows table and profile_view_count to users |
  | V16 | Add project_id column to execution_requests |

---

## Frontend - Source Layout
`frontend/src/`:
- `api/` - Axios client modules per domain (13 files)
- `assets/` - SVG icon assets (`NN_name.svg` naming convention)
- `components/` - Reusable UI components
- `context/` - `AuthContext`, `WebSocketContext`, `NotificationContext`, `EditorContext`, `ProjectsContext`, `ThemeContext`
- `hooks/` - Custom React hooks
- `pages/` - Route-level page components
- `utils/` - Utility functions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.x |
| Security | Spring Security, JWT (JJWT), Google OAuth2, GitHub OAuth2 |
| Frontend | React 18, **JavaScript (JSX)**, Vite, Tailwind CSS, Monaco Editor |
| Database | PostgreSQL 16 (single DB: `devopssuite`), Flyway migrations |
| Cache | Redis 7 (token blacklist, rate limiting, user/project cache) |
| Search | Elasticsearch 8.12 + Kibana |
| Observability | Prometheus + Grafana |
| Real-time | WebSocket STOMP/SockJS |
| Container | Docker, Docker Compose |
| CI/CD | GitHub Actions |
