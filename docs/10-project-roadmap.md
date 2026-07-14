# Project Roadmap - DevOps Suite

## 1. Overview

Phased delivery: 6 phases over 40 weeks aligned with PLAN.md.

---

## 2. Development Phases

gantt chart showing 6 phases over 40 weeks
Phase 1 Foundation: Auth Gateway Project Logging Kafka (Weeks 1-8)
Phase 2 Code Execution: Docker Sandbox Execution Service (Weeks 9-14)
Phase 3 Observability: Metrics Prometheus Grafana (Weeks 15-20)
Phase 4 Real-time Notifications: WebSocket STOMP Notification Service (Weeks 21-26)
Phase 5 Frontend: React SPA Monaco Kanban Board (Weeks 27-34)
Phase 6 Top Tier Polish: Zipkin Resilience4j Analytics Health (Weeks 35-40)

---

## 3. Phase Details

### Phase 1: Foundation (Weeks 1-8)
- Auth Service: User registration, login, JWT, RBAC, OAuth2 Google
- API Gateway: Spring Cloud Gateway, JWT validation, rate limiting
- Project Service: Project CRUD, task management, Kanban state
- Logging Service: Centralized log ingestion, Kafka setup
- CI/CD: GitHub Actions, multi-stage Docker builds, Docker Compose

### Phase 2: Code Execution (Weeks 9-14)
- Code Execution Service: Docker sandbox, container pool
- Security: CPU/mem limits, seccomp profiles, no-network, read-only root
- Resource management: Time limits, concurrent execution caps
- Integration with Logging Service for execution logs

### Phase 3: Observability (Weeks 15-20)
- Metrics Service: Prometheus endpoint aggregation
- Grafana dashboards: Service health, request rates, error rates
- Actuator health endpoints per service
- Log aggregation and search capabilities

### Phase 4: Real-time and Notifications (Weeks 21-26)
- WebSocket STOMP over SockJS for real-time communication
- Notification Service: Email and in-app notifications
- Kafka consumers for event-driven notifications
- Real-time log streaming to frontend
- Toast notifications for task assignment and errors

### Phase 5: Frontend (Weeks 27-34)
- React 18 SPA with TypeScript and React Router
- Monaco Editor: Code writing with syntax highlighting
- Kanban Board: Drag-and-drop task management with react-beautiful-dnd
- Log Viewer: Real-time WebSocket log streaming with filtering
- Metrics Dashboard: Charts with Recharts
- Auth Flow: Login, register, JWT token management

### Phase 6: Top Tier Polish (Weeks 35-40)
- Distributed Tracing: Zipkin and Spring Cloud Sleuth
- Resilience: Resilience4j circuit breaker, retry, rate limiter
- Analytics Dashboard: System-wide metrics visualization
- Health Page: Service and infrastructure status indicators
- Security Audit: OWASP checks, penetration testing
- Load Testing: k6 scripts for performance validation

---

## 4. Deliverables Per Phase

| Phase | Key Deliverables |
|-------|-----------------|
| Phase 1 | Working auth, gateway routing, project CRUD, log ingestion |
| Phase 2 | Code execution in Docker sandbox, resource limits enforced |
| Phase 3 | Grafana dashboards, Prometheus metrics, health endpoints |
| Phase 4 | WebSocket log streaming, notifications, Kafka pipeline |
| Phase 5 | Full React SPA with Monaco, Kanban, log viewer, metrics |
| Phase 6 | Tracing, circuit breaker, analytics, health page, security audit |

---

## 5. Risk Mitigation

- Docker sandbox: Security audits, seccomp profiles, resource limits
- Database: Connection pooling, indexing, one DB per service
- Availability: Health checks, circuit breakers, auto-restart
- Consistency: Eventual consistency, idempotent operations
- WebSocket: Authentication via JWT, connection limits, heartbeat monitoring
- Kafka: Dead letter queues, consumer group isolation, message TTL
- Security: OWASP top 10 checks, RBAC enforcement, secret rotation

---

## 6. Success Criteria

- All 7 microservices deployed and communicating via REST and Kafka
- Frontend fully functional with Monaco, Kanban, and real-time features
- Monitoring stack operational: Prometheus, Grafana, Zipkin, Loki
- Circuit breakers active on all inter-service calls
- Security audit passed with no critical vulnerabilities
- Load test: 100 concurrent users, p95 latency under 500ms

## 7. Detailed Task Breakdown

### Phase 1: Foundation (Weeks 1-8)

#### Week 1-2: Project Setup and Auth Service
- Set up Spring Boot multi-module Maven project
- Create auth-service module with Spring Security
- Implement user registration endpoint with password hashing (BCrypt)
- Implement login endpoint with JWT token generation
- Add role-based access control (RBAC) middleware
- Write unit tests for auth flows
- Create Dockerfile for auth-service

#### Week 3-4: API Gateway and Project Service
- Set up Spring Cloud Gateway with route configuration
- Implement JWT validation filter in gateway
- Add rate limiting filter (Redis-backed)
- Create project-service with project CRUD operations
- Implement task management (create, update, delete, assign)
- Add Kanban state machine (TODO, IN_PROGRESS, IN_REVIEW, DONE)
- Write integration tests for gateway routing and project CRUD

#### Week 5-6: Database and Infrastructure
- Set up PostgreSQL with Flyway migrations
- Create database schemas for all entities
- Configure Redis for caching and rate limiting
- Set up Kafka with topic creation scripts
- Configure connection pooling (HikariCP) per service
- Write database migration scripts

#### Week 7-8: Logging and CI/CD
- Create logging-service with Kafka consumer
- Implement dual-write to PostgreSQL and Elasticsearch
- Set up Elasticsearch index mappings
- Create GitHub Actions CI/CD pipeline
- Add multi-stage Docker builds to pipeline
- Set up Docker Compose for local development
- Write end-to-end tests for Phase 1 features

#### Phase 1 Deliverables
- Working auth service with JWT and RBAC
- API gateway routing with validation and rate limiting
- Project and task CRUD with Kanban states
- Centralized logging pipeline
- CI/CD pipeline with Docker builds

---

### Phase 2: Code Execution (Weeks 9-14)

#### Week 9-10: Docker Sandbox Core
- Create code-execution-service module
- Implement Docker client integration (docker-java)
- Build container pool manager for warm containers
- Implement code execution endpoint (submit code, get results)
- Add support for Java, Python, and JavaScript runtimes
- Write unit tests for container lifecycle management

#### Week 11-12: Security and Resource Limits
- Implement CPU and memory limits per container
- Add seccomp profiles for container hardening
- Disable network access for execution containers
- Set read-only root filesystem
- Implement execution time limits (max 30 seconds)
- Add concurrent execution caps per user
- Write security-focused integration tests

#### Week 13-14: Integration and Monitoring
- Integrate execution results with logging-service
- Add Kafka events for execution status changes
- Implement execution history and status tracking
- Add Prometheus metrics for execution counts and durations
- Write load tests for concurrent code execution
- Document Docker sandbox security model

#### Phase 2 Deliverables
- Code execution service with Docker sandbox
- Container pool with resource limits and security hardening
- Execution logging and metrics pipeline
- Security documentation and test results

---

### Phase 3: Observability (Weeks 15-20)

#### Week 15-16: Metrics Collection
- Create metrics-service module
- Implement Kafka consumer for metric-events
- Add Prometheus endpoint aggregation
- Configure per-service Actuator health endpoints
- Implement metric types: counter, gauge, timer, histogram
- Write unit tests for metric aggregation

#### Week 17-18: Grafana Dashboards
- Set up Grafana with Prometheus datasource
- Create service health dashboard (CPU, memory, request rates)
- Create API performance dashboard (latency, throughput, error rates)
- Create task metrics dashboard (completion rates, cycle time)
- Create user activity dashboard
- Configure alert rules in Grafana

#### Week 19-20: Alerting and Alert Rules
- Implement alert rule engine in metrics-service
- Add alert conditions: greater than, less than, percentage change
- Configure notification channels for alerts
- Add log aggregation search capabilities
- Create Kibana dashboards for log analysis
- Write end-to-end observability tests

#### Phase 3 Deliverables
- Metrics collection and aggregation pipeline
- Grafana dashboards for all key metrics
- Alert rules and notification channels
- Log search and analysis capabilities

---

### Phase 4: Real-time and Notifications (Weeks 21-26)

#### Week 21-22: WebSocket STOMP Setup
- Configure WebSocket with STOMP over SockJS
- Implement JWT authentication for WebSocket connections
- Add topic-based subscription model
- Create real-time log streaming for projects
- Create real-time task update notifications
- Write WebSocket integration tests

#### Week 23-24: Notification Service
- Create notification-service module
- Implement Kafka consumers for notification-events
- Add notification persistence in PostgreSQL
- Implement notification CRUD (list, mark read, delete)
- Add unread count tracking
- Write notification service tests

#### Week 25-26: Event-Driven Integration
- Connect all services to notification pipeline
- Add task assignment notifications
- Add code execution status notifications
- Implement toast notifications in frontend
- Add notification preferences per user
- Write end-to-end notification flow tests

#### Phase 4 Deliverables
- WebSocket STOMP real-time communication
- Notification service with persistence and delivery
- Event-driven notification pipeline across all services
- Real-time log streaming and task updates

---

### Phase 5: Frontend (Weeks 27-34)

#### Week 27-28: Auth and Layout
- Set up React 18 with TypeScript and React Router
- Implement login and registration pages
- Add JWT token management (localStorage, refresh)
- Create responsive layout with navigation
- Add protected route components
- Write component tests with React Testing Library

#### Week 29-30: Monaco Editor and Code Execution
- Integrate Monaco Editor with syntax highlighting
- Add language selection (Java, Python, JavaScript)
- Implement code submission and execution display
- Add execution history viewer
- Create code snippet saving feature
- Write Monaco editor integration tests

#### Week 31-32: Kanban Board
- Implement Kanban board with react-beautiful-dnd
- Add drag-and-drop task movement between columns
- Implement task creation and editing modals
- Add task assignment and filtering
- Create task detail view with comments
- Write Kanban board interaction tests

#### Week 33-34: Log Viewer and Metrics Dashboard
- Implement real-time log viewer with WebSocket
- Add log filtering (level, service, search query)
- Create metrics dashboard with Recharts
- Add time range selection for metrics
- Implement toast notification component
- Write end-to-end frontend tests

#### Phase 5 Deliverables
- Complete React SPA with all pages
- Monaco code editor with execution
- Kanban board with drag-and-drop
- Real-time log viewer and metrics dashboard

---

### Phase 6: Top Tier Polish (Weeks 35-40)

#### Week 35-36: Distributed Tracing
- Integrate Spring Cloud Sleuth with Zipkin
- Add trace IDs to all service requests
- Create Zipkin dependency graph visualization
- Implement trace search and filtering
- Add trace correlation with logs
- Write tracing integration tests

#### Week 37-38: Resilience and Security
- Implement Resilience4j circuit breaker on all services
- Add retry and rate limiter patterns
- Configure fallback behavior for service failures
- Perform OWASP security audit
- Conduct penetration testing
- Fix critical and high severity vulnerabilities

#### Week 39-40: Analytics, Health, and Load Testing
- Create analytics dashboard with system-wide metrics
- Implement health page with service status indicators
- Write k6 load test scripts
- Execute load tests: 100 concurrent users target
- Optimize based on load test results
- Final documentation and handoff

#### Phase 6 Deliverables
- Distributed tracing with Zipkin
- Circuit breakers and resilience patterns
- Security audit completed
- Load test: 100 users, p95 under 500ms
- Analytics and health dashboards

---

## 8. Phase Dependencies

| Phase | Depends On | Blocked By |
|---|---|---|
| Phase 1 | None | None |
| Phase 2 | Phase 1 (Docker, Kafka, Auth) | None |
| Phase 3 | Phase 1 (Logging pipeline) | None |
| Phase 4 | Phase 1 (Kafka, Auth) | Phase 2 (Execution events) |
| Phase 5 | Phases 1-4 (All APIs) | Phase 4 (WebSocket, Notifications) |
| Phase 6 | Phases 1-5 (Full system) | Phase 5 (Frontend integration) |
