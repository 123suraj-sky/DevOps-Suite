# DevOps Suite - Implementation Plan

## Architecture
7 Spring Boot microservices + React frontend behind an API Gateway, backed by PostgreSQL/Redis, delivered via Docker and CI/CD.

Services: api-gateway, auth-service, code-execution-service, project-service, logging-service, metrics-service, notification-service (optional), frontend, docker-compose.yml, README.md

## Phase 1: Foundation
- Scaffold Spring Boot modules for each service.
- auth-service: signup/login, JWT, optional Google OAuth2.
- api-gateway: routing to services, JWT validation, CORS.
- docker-compose with Postgres + Redis + services.
- Deliverable: login works end to end through gateway.

## Phase 2: Core Features
- code-execution-service: run submitted code in a sandboxed Docker container (no network, memory/cpu limits, timeout), return stdout/stderr/exit code.
- project-service: Project, Board, Task, User entities; CRUD; task assignment; status transitions.
- Basic logging: request logging filter per service, central logging-service storing logs in Postgres.
- Deliverable: run code, manage Kanban project, logs recorded per request.

## Phase 3: Advanced Backend
- Logging upgrade to Elasticsearch + Kibana dashboards.
- API Gateway: Redis-backed rate limiting, request filters, centralized error handling.
- metrics-service: Spring Actuator + Prometheus + Grafana dashboard for latency/errors/traffic.
- Deliverable: searchable logs, rate limited gateway, live metrics dashboard.

## Phase 4: Real-time and Scaling
- WebSocket (STOMP) for live log tail and execution status.
- Kafka for event-driven logging pipeline.
- notification-service consuming Kafka events, sending email/in-app alerts.
- Deliverable: real-time UI updates, Kafka pipeline, notifications working.

## Phase 5: Frontend (parallel from Phase 2)
- React app: /login, /dashboard, /code, /logs, /projects.
- JWT auth flow + Google OAuth button.
- Monaco-based code editor calling code-execution-service.
- Logs viewer with live WebSocket tail.
- Kanban board (drag and drop) for projects.
- Metrics dashboard with charts.

## Dockerization
- Multi-stage Dockerfile per service (Maven build then slim JRE runtime).
- Root docker-compose.yml wiring Postgres, Redis, Kafka+Zookeeper, Elasticsearch+Kibana, all services, frontend.

## CI/CD (GitHub Actions)
1. Checkout code.
2. mvn clean install and run tests.
3. Build Docker images per service.
4. Push images to Docker Hub/GHCR.
5. Deploy (SSH to EC2 docker compose pull/up, or trigger k8s rollout).

## Deployment Options
- Quick demo: Railway or Render.
- Better: single AWS EC2 with docker-compose.
- Stretch: Kubernetes (EKS or Minikube).

## Top Tier Polish (after MVP)
- Distributed tracing (Zipkin/Sleuth).
- Circuit breaker (Resilience4j).
- RBAC (ADMIN/MEMBER roles).
- API analytics dashboard.
- Aggregated system health page.

## Suggested Execution Order
1. auth-service (JWT login standalone).
2. api-gateway routing + JWT passthrough.
3. project-service CRUD.
4. code-execution-service with Docker sandboxing.
5. logging-service (DB-backed first).
6. metrics-service via Actuator.
7. docker-compose.yml for full local stack.
8. Frontend pages against working APIs.
9. GitHub Actions CI/CD.
10. WebSocket/Kafka/notifications last.
