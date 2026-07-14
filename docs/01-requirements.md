# Requirements Specification - DevOps Suite

## 1. Purpose
Define the functional and non-functional requirements for the Developer Productivity Platform (DevOps Suite), a microservices-based system combining code execution, log monitoring, API gateway, and project management.

## 2. Scope
The system provides authenticated users the ability to: write and run code in a sandboxed environment, manage software projects/tasks (Kanban), view centralized logs in real time, and monitor system/API metrics. All access is routed through a single API Gateway.

## 3. Actors
- Guest: can sign up / log in.
- Authenticated User (MEMBER): can run code, manage own projects/tasks, view logs/metrics relevant to their scope.
- Admin (ADMIN): full access, manages users, views all logs/metrics, RBAC control.

## 4. Functional Requirements

### 4.1 Auth Service
- FR-1: User can sign up with email/password.
- FR-2: User can log in and receive a JWT access token (+ refresh token).
- FR-3: User can log in via Google OAuth2.
- FR-4: Passwords are hashed (BCrypt) before storage.
- FR-5: JWT contains user id, roles, and expiry; validated by the gateway on every request.
- FR-6: Support role assignment (ADMIN, MEMBER).

### 4.2 API Gateway
- FR-7: Route incoming requests to the correct downstream service based on path prefix.
- FR-8: Validate JWT on protected routes before forwarding.
- FR-9: Apply per-user/IP rate limiting.
- FR-10: Return consistent error format for auth failures, rate-limit breaches, and downstream errors.

### 4.3 Code Execution Service
- FR-11: Accept code, language, and optional stdin via REST.
- FR-12: Execute code inside an isolated Docker container with no network access and enforced CPU/memory/time limits.
- FR-13: Return stdout, stderr, exit code, and execution time.
- FR-14: Support at least Java, Python, and JavaScript initially (extensible).
- FR-15: Reject execution requests exceeding size/time limits.

### 4.4 Project Management Service
- FR-16: Create/read/update/delete projects.
- FR-17: Create boards with columns (todo/in-progress/done) per project.
- FR-18: Create/update/delete tasks; assign tasks to users; move tasks between columns.
- FR-19: List projects/tasks scoped to the requesting user (or all, for admins).

### 4.5 Logging & Monitoring Service
- FR-20: Every service emits structured request/response logs (method, path, status, latency, user id, timestamp).
- FR-21: Logging service ingests and stores logs centrally.
- FR-22: Logs are searchable/filterable by service, level, time range, user.
- FR-23: Support real-time log streaming to the frontend via WebSocket.

### 4.6 Metrics Service
- FR-24: Expose per-service health and metrics via Spring Actuator.
- FR-25: Aggregate response time, request count, and error rate per endpoint.
- FR-26: Provide a queryable metrics API for the frontend dashboard.

### 4.7 Notification Service (optional/Phase 4)
- FR-27: Send notifications (email or in-app) on defined events (task assigned, execution failure spike, error threshold breached).

## 5. Non-Functional Requirements
- NFR-1 (Security): All inter-service and external traffic authenticated; secrets never hardcoded; code execution fully sandboxed with no host filesystem/network access.
- NFR-2 (Scalability): Each service independently deployable and horizontally scalable; stateless services behind the gateway.
- NFR-3 (Availability): Core services (auth, gateway, project) should tolerate single-instance failure in production topology (post-MVP, via replicas).
- NFR-4 (Performance): API Gateway overhead < 50ms added latency; code execution requests time out at a configurable limit (default 10s).
- NFR-5 (Observability): Every service must expose health checks and structured logs from day one.
- NFR-6 (Maintainability): Each service has its own repo folder, Dockerfile, and independent build/test pipeline.
- NFR-7 (Portability): Entire stack runnable locally via a single docker-compose command.

## 6. Out of Scope (initial release)
- Multi-tenant organizations/billing.
- Support for arbitrary/unlimited programming languages.
- Kubernetes deployment (tracked as stretch goal, not MVP).

## 7. Assumptions & Constraints
- Single PostgreSQL instance per service (database-per-service pattern) to preserve microservice boundaries.
- Docker must be available on the host running code-execution-service.
- Initial target scale: moderate traffic (portfolio/demo scale), not enterprise load.

## 8. Frontend Requirements

### 8.1 React SPA
- FR-28: Frontend is a React 18 SPA with TypeScript and React Router.
- FR-29: Authentication state managed via React Context with JWT token refresh.
- FR-30: Protected routes redirect unauthenticated users to login page.

### 8.2 Code Editor
- FR-31: Monaco Editor integration with syntax highlighting for Java Python and JavaScript.
- FR-32: Send code to Code Execution Service and display results inline.

### 8.3 Kanban Board
- FR-33: Kanban board with drag-and-drop using react-beautiful-dnd.
- FR-34: Create edit delete tasks within board columns.
- FR-35: Assign tasks to users and filter by assignee.

### 8.4 Real-Time Log Viewer
- FR-36: WebSocket client STOMP over SockJS for real-time log streaming.
- FR-37: Logs display with filtering by service level and time range.
- FR-38: Pause and resume real-time streaming toggle.

### 8.5 Notification Toast
- FR-39: Real-time toast notifications via WebSocket subscription.
- FR-40: Notification inbox with read/unread state and mark-as-read.

### 8.6 Metrics Dashboard
- FR-41: Charts showing request count response time and error rate per service.
- FR-42: Recharts for line and bar chart visualizations.
- FR-43: Date range picker for historical metric analysis.
## 9. WebSocket and Real-Time Requirements

- NFR-8 (Real-time): WebSocket connections authenticated via JWT query param during STOMP CONNECT.
- NFR-9 (Scalability): WebSocket broker supports multiple concurrent connections per user.
- NFR-10 (Reliability): WebSocket connections auto-reconnect on disconnect with exponential backoff.
- NFR-11 (Log Streaming): Log events published to Kafka and broadcast to /topic/logs via WebSocket.
- NFR-12 (Notifications): Notification events broadcast to /topic/notifications/{userId}.

## 10. Top Tier Polish Requirements

### 10.1 Distributed Tracing
- FR-44: Spring Cloud Sleuth integrated for automatic trace and span propagation.
- FR-45: Zipkin server for trace collection and visualization.
- FR-46: Trace IDs included in structured log output for correlation.
- FR-47: 10 percent sampling rate configurable via application properties.

### 10.2 Resilience Patterns
- FR-48: Resilience4j circuit breaker on all gateway-to-service routes.
- FR-49: Retry with exponential backoff on transient failures.
- FR-50: Rate limiter per service to prevent cascade failures.
- FR-51: Fallback methods return cached data or default responses when circuit is open.

### 10.3 Analytics Dashboard
- FR-52: Real-time analytics dashboard showing system-wide metrics.
- FR-53: Service dependency graph derived from distributed traces.
- FR-54: Uptime and health status indicators per service.
- FR-55: Historical trend analysis with configurable time windows.

### 10.4 Health Page
- FR-56: Health page showing status of all services, databases, Kafka, Redis.
- FR-57: Automatic status polling every 30 seconds.
- FR-58: Incident history log with timestamps and resolution status.

## 11. Multi-Stage Docker Build Requirements

- NFR-13: Multi-stage Docker builds to minimize production image size.
- NFR-14: Production images contain only JRE with no compiler or source code.
- NFR-15: Docker layer caching for Maven dependencies to speed up rebuilds.

## 12. CI/CD Requirements

- FR-59: GitHub Actions pipeline with matrix build for all services.
- FR-60: Automated unit and integration tests on every push.
- FR-61: Code coverage threshold enforcement via JaCoCo.
- FR-62: Automated Docker image build and push on merge to main.
- FR-63: Staging deployment on develop branch, production on main branch.
- FR-64: Helm chart-based deployment for Kubernetes environments.
