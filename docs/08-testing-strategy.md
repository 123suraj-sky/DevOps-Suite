# Testing Strategy - DevOps Suite

## 1. Overview
Multi-layered testing following the test pyramid, adapted for the monolithic Spring Boot and React application.

---

## 2. Test Pyramid
- **E2E Tests (Cypress/Playwright):** Full user flows (login -> project creation -> code execution -> log review).
- **Integration Tests:** Testcontainers for PostgreSQL and Redis, testing REST and WebSocket controllers.
- **Unit Tests:** JUnit 5 + Mockito for Java business logic; Jest + React Testing Library for React components.

---

## 3. Unit Testing
- **Java:** JUnit 5 + Mockito. Focus on controllers, services, and mappings. Target coverage: >= 80%.
- **React:** Jest + React Testing Library. Mock API calls using MSW (Mock Service Worker).

---

## 4. Integration Testing
- Use **Testcontainers** for database migrations (PostgreSQL) and caching/rate-limiting (Redis).
- Verify database relationships and referential integrity directly.

---

## 5. Spring Application Events Testing Strategy
Instead of Kafka topics, verify that:
- Event publishers correctly trigger Spring events (`UserRegisteredEvent`, `TaskUpdateEvent`).
- Event listeners annotated with `@EventListener` / `@Async` trigger asynchronously.
- Leverage Spring's `@RecordApplicationEvents` to record and assert published events in tests:
  ```java
  @SpringBootTest
  @RecordApplicationEvents
  class EventTest {
      @Autowired
      ApplicationEvents events;
      
      @Test
      void testEventPublishing() {
          // trigger logic
          assertThat(events.stream(UserRegisteredEvent.class)).hasSize(1);
      }
  }
  ```

---

## 6. WebSocket Testing Strategy
- **Unit/Integration Testing:** Verify connection handshake with valid/invalid JWTs, subscription targets, and payloads.
- **Verification flows:** Trigger action -> event listener publishes message to STOMP topic -> check WebSocket subscription payload.
