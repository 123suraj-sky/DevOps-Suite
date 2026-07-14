# Project Folder Structure

## Root

- backend/
- frontend/
- infra/
- .github/workflows/
- docs/
- PLAN.md
- ps.md
- .gitignore

## Backend - Spring Boot Microservices

Each service follows this structure:
- docker/
- src/main/java/com/devopssuite/{module}/{controller,service,repository,model,dto,config}
- src/main/resources/
- src/test/java/
- src/test/resources/

### Services

| Service | Base Package | Port |
|---|---|---|
| common | com.devopssuite.common | - |
| auth-service | com.devopssuite.auth | 8081 |
| api-gateway | com.devopssuite.gateway | 8080 |
| code-execution-service | com.devopssuite.execution | 8082 |
| project-service | com.devopssuite.project | 8083 |
| logging-service | com.devopssuite.logging | 8084 |
| metrics-service | com.devopssuite.metrics | 8085 |
| notification-service | com.devopssuite.notification | 8086 |

### Unique Packages Per Service

| Service | Extra Packages |
|---|---|
| auth-service | (none extra) |
| api-gateway | filter, handler |
| code-execution-service | sandbox |
| project-service | (none extra) |
| logging-service | kafka |
| metrics-service | scheduler |
| notification-service | kafka, websocket |
| common | exception, dto, security, util |

## Frontend - React

- src/api/ - Axios client and interceptors
- src/components/common/ - Reusable UI components
- src/components/layout/ - Sidebar, Header, Footer
- src/pages/Auth/ - Login, Register, OAuth
- src/pages/Projects/ - Project list, board view
- src/pages/Tasks/ - Task card, drag-drop board
- src/pages/CodeEditor/ - Monaco editor, run panel
- src/pages/Logs/ - Log table, filters, live stream
- src/pages/Metrics/ - Dashboard with charts
- src/pages/Dashboard/ - Overview page
- src/hooks/ - Custom hooks (useAuth, useWebSocket)
- src/context/ - React Context providers
- src/store/ - State management
- src/utils/ - Helper functions
- src/types/ - TypeScript types
- src/services/ - Service layer
- src/__tests__/ - Tests
- public/ - Static assets

## Infrastructure

- infra/docker/ - Dockerfiles for each service
- infra/k8s/ - Kubernetes manifests
- infra/nginx/ - Nginx config for frontend
- infra/elasticsearch/ - Elasticsearch config
- infra/kafka/ - Kafka config

## CI/CD

- .github/workflows/build.yml
- .github/workflows/deploy-staging.yml
- .github/workflows/deploy-production.yml

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 22, Spring Boot 4.0.7, Spring Cloud Gateway |
| Auth | Spring Security, JWT, Google OAuth 2.0 |
| Frontend | React, TypeScript, Monaco Editor |
| Database | PostgreSQL, Redis |
| Messaging | Apache Kafka |
| Search | Elasticsearch + Kibana |
| Real-time | WebSocket STOMP SockJS |
| Container | Docker, Docker Compose |
| Orchestration | Kubernetes optional |
| CI/CD | GitHub Actions |
| Tracing | Spring Cloud Sleuth, Zipkin |
| Resilience | Resilience4j |
| Testing | JUnit 5, Mockito, Testcontainers, Cypress |
