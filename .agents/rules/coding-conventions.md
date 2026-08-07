# coding-conventions.md — Code Style & Conventions

> **Coding standards for DevOps Suite.**
> All agents must follow these conventions when writing or modifying code.

---

## ☕ Java / Spring Boot (Backend)

### Package & Naming
- **Base package:** `com.devopssuite.monolith`
- **Sub-packages per domain:** `auth`, `project`, `execution`, `logging`, `metrics`, `notification`, `security`, `config`
- **Class naming:**
  - Controllers: `{Domain}Controller` (e.g., `ProjectController`)
  - Services: `{Domain}Service` (e.g., `ProjectService`)
  - Repositories: `{Entity}Repository` (e.g., `UserRepository`)
  - Entities: Singular noun (e.g., `User`, `Project`, `Task`)
  - DTOs: `{Entity}Request` / `{Entity}Response` (e.g., `LoginRequest`, `AuthResponse`)
  - Events: `{Action}Event` (e.g., `UserRegisteredEvent`, `TaskUpdateEvent`)

### Code Style
- Java 21 features are allowed (records, sealed classes, pattern matching)
- Use **constructor injection** (not field injection with `@Autowired`)
- Mark service classes with `@Service`; repositories with `@Repository`
- `@Transactional` goes on **service methods only**, never on controllers
- Use `Optional<T>` from repositories — never return `null` from service layer
- Log at appropriate levels: `DEBUG` for verbose, `INFO` for lifecycle, `WARN` for recoverable issues, `ERROR` for failures

### Database / JPA
- **All schema changes must use Flyway migrations** in `backend/src/main/resources/db/migration/`
- Migration naming: `V{N}__short_description.sql` (e.g., `V3__add_task_priority_column.sql`)
- Never use `spring.jpa.hibernate.ddl-auto=create` or `update` — always `validate` in production
- Entity relationships: use `@ManyToOne`, `@OneToMany(mappedBy=...)` — avoid bidirectional unless needed
- Always define `@Column(nullable = false)` constraints explicitly

### REST API
- Controller methods return `ResponseEntity<T>` with explicit status codes
- Use `@Valid` on request body parameters for bean validation
- Endpoint paths: lowercase, hyphen-separated (e.g., `/api/projects/{id}/board-columns`)
- HTTP method semantics: `GET` read-only, `POST` create, `PUT` full update, `PATCH` partial update, `DELETE` remove
- Consistent error response format:
  ```json
  {
    "status": 400,
    "error": "Bad Request",
    "message": "Project name cannot be blank",
    "timestamp": "2026-08-07T07:30:00Z"
  }
  ```

### Security
- All secrets via `@Value("${property}")` from environment — never hardcoded
- Security config lives in `com.devopssuite.monolith.security.SecurityConfig`
- JWT utility in `com.devopssuite.monolith.security.JwtUtil`
- Filter in `com.devopssuite.monolith.security.JwtRequestFilter`

---

## ⚛️ JavaScript / React (Frontend)

### File Naming
- **Components:** PascalCase `.jsx` (e.g., `KanbanBoard.jsx`, `TaskCard.jsx`)
- **Pages:** PascalCase `.jsx` in `pages/` (e.g., `ProjectsPage.jsx`)
- **API clients:** camelCase `.js` in `api/` (e.g., `projectApi.js`, `authApi.js`)
- **Context files:** PascalCase in `context/` (e.g., `AuthContext.jsx`)
- **Utilities:** camelCase `.js` in `utils/` (e.g., `dateUtils.js`)

### React Conventions
- Use **functional components** with hooks — no class components
- Custom hooks start with `use` (e.g., `useAuth`, `useWebSocket`)
- Keep components small and focused — extract sub-components when JSX exceeds ~80 lines
- Use `React.memo` for expensive list items (e.g., `TaskCard` in Kanban)
- Lazy-load page-level components with `React.lazy` + `Suspense` (already set up in `App.jsx`)

### State Management
- Use **React Context** for cross-cutting state (auth, notifications, WebSocket)
- Use `useState` + `useEffect` for local component state
- Do not introduce Redux or Zustand unless explicitly requested

### API Calls
- All API calls go through the Axios clients in `src/api/` — never use `fetch` directly
- Handle errors in the calling component — show user-facing error messages
- Loading state: always show a loading indicator while awaiting API responses

### Styling
- **Tailwind CSS** for all styling — stay consistent with existing components
- Avoid inline styles except for dynamic values (e.g., calculated widths)
- Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) for responsiveness
- Dark mode: use Tailwind's `dark:` variant if the page already supports it

### WebSocket
- WebSocket connection lifecycle managed by `WebSocketContext`
- Subscribe to topics via the context, not directly in components
- Always unsubscribe from STOMP subscriptions in the `useEffect` cleanup function

---

## 🐳 Docker / Infrastructure

### docker-compose.yml
- All service names are lowercase with hyphens (e.g., `postgres`, `redis`, `elasticsearch`)
- All environment variables reference `.env` file using `${VAR_NAME}` syntax
- Expose ports only when needed for local development — use internal networking otherwise
- Always define `healthcheck` for database and cache services

### Flyway Migrations
- One concern per migration file — keep them small and reversible where possible
- Always test migration against a clean database before committing
- Migration files are append-only — never edit an existing migration that has been applied

---

## 📝 Git Conventions

### Commit Messages
Use [Conventional Commits](https://www.conventionalcommits.org/) format:
```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types:**
| Type | Use for |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style (formatting, no logic change) |
| `refactor` | Code refactor (no feature/fix) |
| `test` | Adding/updating tests |
| `chore` | Build, CI, dependency updates |

**Scopes:** `auth`, `project`, `execution`, `logging`, `metrics`, `notification`, `frontend`, `infra`, `ci`

**Examples:**
```
feat(project): add task priority field and sorting
fix(auth): handle expired refresh token gracefully
docs(agents): update TASKS.md with new backlog items
chore(infra): add multi-stage Dockerfile for backend
```

### Branch Naming
```
feature/{scope}/{short-description}     # e.g., feature/execution/docker-sandbox-runner
fix/{scope}/{short-description}         # e.g., fix/auth/refresh-token-expiry
chore/{short-description}               # e.g., chore/add-github-actions
```

---

## ✅ Quality Checklist (Before Committing)

- [ ] Backend compiles: `mvn clean compile` passes
- [ ] No hardcoded secrets or localhost URLs in source code
- [ ] New DB schema changes have a Flyway migration
- [ ] API error responses follow the standard format
- [ ] Frontend: no `console.log` left in production code
- [ ] `@Transactional` is only on service methods, not controllers
- [ ] Environment variables are documented in `.env.example`
