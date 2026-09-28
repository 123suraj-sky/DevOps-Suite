# Testing Strategy — DevOps Suite

## 1. Overview

Multi-layered testing following the test pyramid, adapted for the monolithic Spring Boot backend and React frontend.

> **Current status (2026-09-24):** Unit tests implemented for core services. Integration tests in progress. E2E Cypress framework is scaffolded but test scenarios are not yet written.

---

## 2. Test Pyramid

```
            ┌────────────┐
            │ E2E (Cypress) │  ← Scaffolded, not written yet
            └────────────┘
          ┌──────────────────┐
          │ Integration Tests │  ← JUnit + Testcontainers
          └──────────────────┘
        ┌──────────────────────┐
        │ Unit Tests            │  ← JUnit 5 + Mockito (backend) / Jest (frontend)
        └──────────────────────┘
```

- **Unit Tests:** JUnit 5 + Mockito for Java business logic; Jest + React Testing Library for React components
- **Integration Tests:** Testcontainers for PostgreSQL and Redis; Spring Boot test slices for controller/service layer
- **E2E Tests (Cypress):** Full user flows — `cypress/` directory scaffolded, test scenarios pending

---

## 3. Unit Testing

### Backend (Java)
- **Framework:** JUnit 5 + Mockito
- **Location:** `backend/src/test/java/com/devopssuite/`
- **Coverage:** JaCoCo integrated; reports generated on `mvn test`
- **Focus areas:**
  - `AuthService` — registration validation, JWT generation, refresh token logic
  - `TaskService` — WIP limit enforcement, reorder logic
  - `ExecutionQueueWorker` — sandbox status transitions
  - `NotificationService` — preference-gated delivery

### Frontend (JavaScript/React)
- **Framework:** Jest + React Testing Library
- **Location:** `frontend/src/__tests__/` and per-component `__tests__/` folders
- **Mocking:** MSW (Mock Service Worker) for API call mocking
- **Focus areas:**
  - `AuthContext` — login/logout state transitions
  - `ProjectsContext` — CRUD state updates
  - Layout components — `Header`, `Sidebar` render guards

---

## 4. Integration Testing

- **Testcontainers** for ephemeral PostgreSQL and Redis instances in CI
- Verify Flyway migrations apply cleanly against a fresh database
- Test REST endpoints via `MockMvc` / `WebTestClient` with full Spring context
- Test WebSocket flow: STOMP connect → subscribe → message received

```java
// Example: verify task creation triggers WebSocket broadcast
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TaskWebSocketIntegrationTest {
    // Connect via STOMP, subscribe to /topic/tasks/{projectId}
    // POST /api/projects/{id}/tasks
    // Assert message received on topic within 2s
}
```

---

## 5. Spring Application Events Testing

Verify event-driven notification delivery without Kafka:

```java
@SpringBootTest
@RecordApplicationEvents
class NotificationEventTest {
    @Autowired
    ApplicationEvents events;

    @Test
    void taskAssigned_publishesNotificationEvent() {
        // trigger task assignment in TaskService
        assertThat(events.stream(TaskAssignedEvent.class)).hasSize(1);
    }
}
```

Key events to test: `TaskAssignedEvent`, `TaskReassignedEvent`, `TaskCompletedEvent`, `ExecutionFailedEvent`, `UserRegisteredEvent`

---

## 6. WebSocket Testing

- **STOMP JWT auth:** Test that `StompAuthChannelInterceptor` rejects invalid/expired tokens with STOMP ERROR frame
- **Topic subscriptions:** Subscribe to `/topic/tasks/{projectId}`, trigger task update, assert message payload
- **Notification delivery:** Trigger notification event, assert message arrives on `/topic/notifications/{userId}`

---

## 7. Code Execution Sandbox Testing

- Mock `DockerSandbox` in unit tests to avoid Docker dependency
- Integration tests with real Docker require Docker Desktop running (skip in CI if unavailable)
- Test all 4 language runners: Python, JavaScript, Java, C++
- Test timeout enforcement (30s default), OOM kill detection, no-network isolation

---

## 8. E2E Testing (Cypress) — Pending

`cypress/` directory is scaffolded. Test scenarios to write:

| Scenario | Priority |
|---|---|
| User registration + login flow | High |
| Create project → add board → create task | High |
| Move task through Kanban columns | High |
| Submit Python code → view output | High |
| WebSocket notification appears after task assignment | Medium |
| Log viewer shows entries after execution | Medium |
| Admin user sees AdminDashboard, member sees UserDashboard | Medium |
| Forgot password → reset password flow | Low |

---

## 9. Running Tests

```bash
# Backend unit + integration tests
cd backend && mvn test

# Backend compile check only
cd backend && mvn clean compile

# Frontend tests
cd frontend && npm test

# E2E (requires backend + frontend running)
cd frontend && npx cypress open   # interactive
cd frontend && npx cypress run    # headless CI
```
