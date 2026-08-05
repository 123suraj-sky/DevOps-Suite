# Requirements Specification - DevOps Suite

## 1. Purpose
Define the functional and non-functional requirements for the Developer Productivity Platform (DevOps Suite), a monolithic system combining code execution, log monitoring, security, and project management.

## 2. Scope
The system provides authenticated users the ability to: write and run code in a sandboxed environment, manage software projects/tasks (Kanban), view centralized logs in real time, and monitor system/API metrics. All access is validated by the monolith security filter.

## 3. Actors
- Guest: can sign up / log in.
- Authenticated User (MEMBER): can run code, manage own projects/tasks, view logs/metrics relevant to their scope.
- Admin (ADMIN): full access, manages users, views all logs/metrics, RBAC control.

## 4. Functional Requirements

### 4.1 Auth Module
- FR-1: User can sign up with email/password.
- FR-2: User can log in and receive a JWT access token (+ refresh token).
- FR-3: User can log in via Google OAuth2.
- FR-4: Passwords are hashed (BCrypt) before storage.
- FR-5: JWT contains user id, roles, and expiry; validated by the monolith security filter on every request.
- FR-6: Support role assignment (ADMIN, MEMBER).

### 4.2 Security & Request Filtering
- FR-7: Route incoming request paths to the correct internal controller mapping.
- FR-8: Validate JWT on protected paths before processing controllers.
- FR-9: Apply rate limiting to REST endpoints using Redis.
- FR-10: Return consistent error format for auth failures, rate-limit breaches, and business errors.

### 4.3 Code Execution Module
- FR-11: Accept code, language, and optional stdin via REST.
- FR-12: Execute code inside an isolated Docker container with no network access and enforced CPU/memory/time limits.
- FR-13: Return stdout, stderr, exit code, and execution time.
- FR-14: Support at least Java, Python, and JavaScript initially (extensible).
- FR-15: Reject execution requests exceeding size/time limits.

### 4.4 Project Management Module
- FR-16: Create/read/update/delete projects.
- FR-17: Create boards with columns (todo/in-progress/done) per project.
- FR-18: Create/update/delete tasks; assign tasks to users; move tasks between columns.
- FR-19: List projects/tasks scoped to the requesting user (or all, for admins).

### 4.5 Logging & Monitoring Module
- FR-20: Monolith emits structured request/response logs (method, path, status, latency, user id, timestamp).
- FR-21: Log events are consolidated centrally in Elasticsearch.
- FR-22: Logs are searchable/filterable by package, level, time range, user.
- FR-23: Support real-time log streaming to the frontend via WebSocket.

### 4.6 Metrics Module
- FR-24: Expose application health and metrics via Spring Actuator.
- FR-25: Aggregate response time, request count, and error rate per endpoint.
- FR-26: Provide a queryable metrics API for the frontend dashboard.

### 4.7 Notification Module
- FR-27: Send notifications (email or in-app) on defined events (task assigned, execution failure spike, error threshold breached) using internal Spring events.

## 5. Non-Functional Requirements
- NFR-1 (Security): All traffic authenticated; secrets never hardcoded; code execution fully sandboxed with no host filesystem/network access.
- NFR-2 (Scalability): Monolith backend horizontally scalable; stateless design.
- NFR-3 (Availability): The backend should tolerate instance failures in production topology (post-MVP, via replicas/load balancing).
- NFR-4 (Performance): Filter chain overhead < 5ms added latency; code execution requests time out at a configurable limit (default 10s).
- NFR-5 (Observability): Monolith must expose health checks and structured logs from day one.
- NFR-6 (Maintainability): Consistently structured packages, single Dockerfile, and single build/test pipeline.
- NFR-7 (Portability): Entire stack runnable locally via a single docker-compose command.

## 6. Out of Scope (initial release)
- Multi-tenant organizations/billing.
- Support for arbitrary/unlimited programming languages.
- Kubernetes deployment (tracked as stretch goal, not MVP).

## 7. Assumptions & Constraints
- Single PostgreSQL instance and consolidated database schema to manage user, project, and code execution entities.
- Docker must be available on the host running code-execution sandbox.
- Initial target scale: moderate traffic (portfolio/demo scale), not enterprise load.

## 8. Frontend Requirements

### 8.1 React SPA
- FR-28: Frontend is a React 18 SPA with TypeScript and React Router.
- FR-29: Authentication state managed via React Context with JWT token refresh.
- FR-30: Protected routes redirect unauthenticated users to login page.

### 8.2 Code Editor
- FR-31: Monaco Editor integration with syntax highlighting for Java Python and JavaScript.
- FR-32: Send code to Code Execution endpoints and display results inline.

### 8.3 Kanban Board
- FR-33: Kanban board with drag-and-drop using react-beautiful-dnd.
- FR-34: Create edit delete tasks within board columns.
- FR-35: Assign tasks to users and filter by assignee.

### 8.4 Real-Time Log Viewer
- FR-36: WebSocket client STOMP over SockJS for real-time log streaming.
- FR-37: Logs display with filtering by level and time range.
- FR-38: Pause and resume real-time streaming toggle.

### 8.5 Notification Toast
- FR-39: Real-time toast notifications via WebSocket subscription.
- FR-40: Notification inbox with read/unread state and mark-as-read.

### 8.6 Metrics Dashboard
- FR-41: Charts showing request count response time and error rate.
- FR-42: Recharts for line and bar chart visualizations.
- FR-43: Date range picker for historical metric analysis.

## 9. WebSocket and Real-Time Requirements
- NFR-8 (Real-time): WebSocket connections authenticated via JWT query param during STOMP CONNECT.
- NFR-9 (Scalability): WebSocket broker supports multiple concurrent connections per user.
- NFR-10 (Reliability): WebSocket connections auto-reconnect on disconnect with exponential backoff.
- NFR-11 (Log Streaming): Log events broadcast to /topic/logs via WebSocket.
- NFR-12 (Notifications): Notification events broadcast to /topic/notifications/{userId}.

## 10. Top Tier Polish Requirements

### 10.1 Tracing
- FR-44: Core trace correlation IDs included in log outputs for request tracking.

### 10.2 Resilience Patterns
- FR-45: Retry with exponential backoff on transient external calls.
- FR-46: Rate limiting on endpoints to prevent abuse.

### 10.3 Health Page
- FR-47: Health page showing status of database, Redis, and host system.
- FR-48: Automatic status polling every 30 seconds.
- FR-49: Incident history log with timestamps and resolution status.

## 11. Multi-Stage Docker Build Requirements
- NFR-13: Multi-stage Docker builds to minimize production image size.
- NFR-14: Production images contain only JRE with no compiler or source code.
- NFR-15: Docker layer caching for Maven dependencies to speed up rebuilds.

## 12. CI/CD Requirements
- FR-59: GitHub Actions pipeline with single build for the monolithic application.
- FR-60: Automated unit and integration tests on every push.
- FR-61: Code coverage threshold enforcement via JaCoCo.
- FR-62: Automated Docker image build and push on merge to main.
- FR-63: Staging deployment on develop branch, production on main branch.
- FR-64: Helm chart-based deployment for Kubernetes environments.
