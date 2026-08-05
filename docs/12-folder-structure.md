# Project Folder Structure

## Root
- `backend/` - Monolithic Spring Boot backend
- `frontend/` - React frontend application
- `config/` - Monitoring/logging configuration files (Prometheus, Logstash, etc.)
- `docs/` - System architecture and lifecycle documentation

---

## Backend - Monolithic Package Structure
All java sources reside inside `backend/src/main/java/com/devopssuite/monolith/`:

- `auth/` - Authentication logic, user registration, JWT generation, User/Role entities and repositories.
- `project/` - Project, Board, Column, and Task entities, controllers, and services (Kanban updates, WIP limits).
- `execution/` - Sandboxed docker code executor, ephemeral container management.
- `logging/` - Logs collection and ingestion pipeline.
- `metrics/` - Service health actuators and Prometheus scraping configurations.
- `notification/` - Internal message alert dispatching via Spring Application Events.
- `security/` - Shared Spring Security setup, JWT validation filter (`JwtRequestFilter`), and CORS filters.
- `DevOpsSuiteApplication.java` - Application entry point.

### Resources
- `backend/src/main/resources/application.yml` - Central configuration file (running on port `8081`).
- `backend/src/main/resources/db/migration/V1__initial_schema.sql` - Consolidated Flyway database schema.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.4.1 |
| Security | Spring Security, JWT, Google OAuth 2.0 |
| Frontend | React, TypeScript, Monaco Editor |
| Database | PostgreSQL, Redis |
| Search | Elasticsearch + Kibana |
| Real-time | WebSocket STOMP SockJS |
| Container | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Testing | JUnit 5, Mockito, Testcontainers, Cypress |
