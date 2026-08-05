# Phase 2 Project Service Remediation Plan

Date: 2026-07-19

## Goal

Bring `project-service` into alignment with the database design in `docs/03-database-design.md`, the API contract in `docs/04-api-design.md`, and the expected security model for project, board, column, task, and member management.

## Current Assessment

The core Project Service implementation exists and compiles. It includes JPA entities, repositories, DTOs, services, REST controllers, and a JWT/header-based security filter.

However, it is not ready to mark Phase 2 complete because several contract, authorization, and persistence details need correction.

## Fix Plan

### 1. Align API Routes

- Decide the canonical route style for the whole backend:
  - Preferred: `/api/v1/...` externally through the gateway.
  - Service-local controllers can either expose `/api/v1/...` directly or expose resource paths while the gateway rewrites consistently.
- Update API Gateway project routes so documented endpoints resolve correctly.
- Update Project Service controllers to support the documented contract:
  - `POST /api/v1/projects`
  - `GET /api/v1/projects?page=1&size=20`
  - `GET /api/v1/projects/{project_id}`
  - `PUT /api/v1/projects/{project_id}`
  - `DELETE /api/v1/projects/{project_id}`
  - `POST /api/v1/projects/{project_id}/boards`
  - `POST /api/v1/boards/{board_id}/tasks`
- Keep frontend compatibility only if it does not conflict with the public API contract.

### 2. Complete Board and Column Operations

- Add service methods and controller endpoints for:
  - Create board under project.
  - List boards for project.
  - Create column under board.
  - Update column metadata and WIP limit.
  - Delete column with safe handling for existing tasks.
- Validate parent-child ownership:
  - Board must belong to the requested project.
  - Column must belong to the requested board.
  - Task must belong to a column in the requested board/project.

### 3. Enforce Project-Level Authorization

- Introduce a central authorization helper in `ProjectService` or a dedicated authorization component.
- Apply access checks to every project-owned operation:
  - Read project/boards/tasks: project member or owner.
  - Update project: owner or admin role.
  - Delete project: owner only.
  - Add/remove members: owner or admin role.
  - Create/update/delete/move tasks: project member, with role rules defined explicitly.
- Ensure `TaskService` can resolve a task's project through task -> column -> board -> project before authorizing mutations.
- Return correct HTTP statuses:
  - 401 for unauthenticated.
  - 403 for authenticated but unauthorized.
  - 404 for missing resources.
  - 409 or 422 for business rule violations.

### 4. Harden Authentication and Local Testing

- Decide whether standalone mock auth is enabled.
- If enabled, make it explicit and profile/property gated, for example:
  - `project.security.mock-user.enabled=true`
  - `project.security.mock-user.id=<uuid>`
- Do not silently trust spoofed `X-User-Id` headers in production-like profiles.
- Keep gateway-forwarded identity headers for service-to-service traffic, but document that direct service access is for local/dev only.
- Make token parsing consistent with `auth-service` JWT claims.

### 5. Normalize DTO and JSON Contract

- Remove duplicate response fields such as both `createdAt` and `created_at` unless there is a documented compatibility reason.
- Standardize on the API design's snake_case response contract:
  - `project_id`
  - `owner_id`
  - `member_count`
  - `created_at`
  - `updated_at`
- Accept request field aliases only where needed for frontend compatibility.
- Add validation annotations to request DTOs:
  - Required names/titles.
  - Valid role values.
  - Non-negative sort orders.
  - Valid WIP limits.

### 6. Add Database Migrations and Indexes

- Add migration scripts under `backend/project-service/src/main/resources/db/migration/`.
- Create tables matching `docs/03-database-design.md`:
  - `projects`
  - `project_members`
  - `boards`
  - `columns`
  - `tasks`
- Add documented indexes:
  - `idx_projects_owner`
  - `idx_proj_member_user`
  - `idx_proj_member_project`
  - `idx_boards_project`
  - `idx_columns_board`
  - `idx_tasks_column`
  - `idx_tasks_assignee`
- Change local configuration away from relying on `ddl-auto: update` for schema creation once migrations exist.

### 7. Improve Query Efficiency

- Replace `projectRepository.findAll()` plus in-memory filtering with repository queries that fetch projects by owner/member.
- Add query methods for common access paths:
  - Projects by owner.
  - Projects by member.
  - Boards by project.
  - Columns by board.
  - Tasks by column and assignee.
- Avoid repeated N+1 lookups when returning boards with columns and tasks.

### 8. Add Error Handling

- Add a Project Service exception handler using `@RestControllerAdvice`.
- Shape errors according to `docs/04-api-design.md`:
  - `error.code`
  - `error.message`
  - `error.details`
  - `error.request_id`
  - `error.timestamp`
- Map service exceptions to the correct HTTP statuses.

### 9. Add Tests

- Add focused unit tests for:
  - Project creation creates owner membership and default board/columns.
  - Authorization rules for project/member/task operations.
  - Task movement between columns.
  - WIP limit behavior if enforced.
- Add controller tests for:
  - API route contract.
  - Authenticated and unauthenticated requests.
  - Error response shape.
- Add repository/integration tests if Testcontainers or an embedded DB test strategy is available.

### 10. Verification

- Run from `backend`:
  - `mvn clean compile`
  - `mvn test`
- Run service locally with infrastructure:
  - PostgreSQL
  - Redis if required
  - Kafka only if service startup requires it
- Manually verify:
  - Create project.
  - List projects.
  - Create board.
  - Create columns.
  - Create task.
  - Move/reorder task.
  - Access denied for non-members.
  - Gateway path works with documented `/api/v1/...` endpoints.

## Suggested Implementation Order

1. Fix gateway/controller route alignment.
2. Add board/column create/update support.
3. Add central project authorization checks.
4. Normalize DTOs and error responses.
5. Add migrations and indexes.
6. Add tests.
7. Run compile, tests, and manual API verification.

## Done Criteria

- Documented Project Service API endpoints work through the API Gateway.
- Direct Project Service endpoints work in local development with explicit mock auth or valid JWTs.
- Every project-owned resource operation checks project membership/role.
- Database migrations create the intended schema and indexes.
- Backend compile passes.
- Project Service tests cover core CRUD, authorization, and task movement behavior.
