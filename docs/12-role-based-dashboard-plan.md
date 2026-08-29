# Implementation Plan — Role-Based Dashboard & Metrics

> **Goal:** Restrict the system-wide infrastructure dashboard and the Metrics page to `ROLE_ADMIN` users only.
> Regular `ROLE_MEMBER` users get a personal activity dashboard instead.
>
> **Affected docs:** `01-requirements.md`, `04-api-design.md`, `06-security-design.md`, `11-frontend-design.md`

---

## Overview of Changes

| Layer | What changes |
|---|---|
| Backend — Security config | Lock `/api/metrics/dashboard` and `/actuator/**` to `ROLE_ADMIN`; keep `/actuator/health` public |
| Backend — Metrics controller | Add `GET /api/metrics/user-summary` endpoint for member-scoped data |
| Backend — Metrics service | Add `getUserSummary(userId)` method querying tasks, executions, and activity by user |
| Frontend — AuthContext | Derive and expose `isAdmin` boolean from the JWT roles array |
| Frontend — Routing | Add `AdminRoute` guard; wrap `/metrics` route with it |
| Frontend — Sidebar | Conditionally render "Metrics" nav link only for admins |
| Frontend — DashboardPage | Branch on `isAdmin`: render `AdminDashboard` or `UserDashboard` |
| Frontend — UserDashboard | New component: personal task stats, recent executions, activity feed |
| Frontend — API client | Add `getUserSummary()` call in the metrics API client |

---

## Phase 1 — Backend

### Step 1.1 — Lock metrics endpoints in `SecurityConfig`

File: `backend/src/main/java/com/devopssuite/security/SecurityConfig.java`

Add the following `requestMatchers` rules **before** the catch-all authenticated rule:

```java
// Actuator — health is public (liveness probe); everything else is admin-only
.requestMatchers("/actuator/health").permitAll()
.requestMatchers("/actuator/**").hasRole("ADMIN")

// Metrics API — dashboard is admin-only; user-summary is any authenticated user
.requestMatchers(HttpMethod.GET, "/api/metrics/dashboard").hasRole("ADMIN")
.requestMatchers(HttpMethod.GET, "/api/metrics/user-summary").authenticated()
```

> No controller changes are needed for the existing `/api/metrics/dashboard` endpoint — the security layer handles the 403 before the controller is reached.

---

### Step 1.2 — Add `getUserSummary` to `MetricsService`

File: `backend/src/main/java/com/devopssuite/metrics/service/MetricsService.java`

Add a new method that queries data scoped to a single user:

```java
public UserSummaryResponse getUserSummary(UUID userId) {
    // Task stats — count by status across all projects the user is a member of
    long open        = taskRepository.countByAssigneeIdAndStatus(userId, TaskStatus.TODO);
    long inProgress  = taskRepository.countByAssigneeIdAndStatus(userId, TaskStatus.IN_PROGRESS);
    long completed   = taskRepository.countByAssigneeIdAndStatus(userId, TaskStatus.DONE);

    // Executions this week
    Instant weekAgo  = Instant.now().minus(7, ChronoUnit.DAYS);
    long execCount   = executionRequestRepository.countByUserIdAndCreatedAtAfter(userId, weekAgo);

    // Last 5 executions
    List<RecentExecution> recentExecs = executionRequestRepository
        .findTop5ByUserIdOrderByCreatedAtDesc(userId)
        .stream()
        .map(this::toRecentExecution)
        .toList();

    // Last 10 activity events (task moves + code executions)
    List<ActivityEvent> activity = buildActivityFeed(userId, 10);

    return new UserSummaryResponse(
        new TaskStats(open, inProgress, completed),
        execCount,
        recentExecs,
        activity
    );
}
```

> **New repository methods needed:**
> - `TaskRepository.countByAssigneeIdAndStatus(UUID, TaskStatus)`
> - `ExecutionRequestRepository.countByUserIdAndCreatedAtAfter(UUID, Instant)`
> - `ExecutionRequestRepository.findTop5ByUserIdOrderByCreatedAtDesc(UUID)`

---

### Step 1.3 — Add DTOs for the user-summary response

File: `backend/src/main/java/com/devopssuite/metrics/dto/UserSummaryResponse.java` (new file)

```java
public record UserSummaryResponse(
    TaskStats taskStats,
    long executionsThisWeek,
    List<RecentExecution> recentExecutions,
    List<ActivityEvent> recentActivity
) {}

public record TaskStats(long open, long inProgress, long completed) {}

public record RecentExecution(
    UUID executionId,
    String language,
    String status,
    long executionTimeMs,
    Instant createdAt
) {}

public record ActivityEvent(String type, String description, Instant timestamp) {}
```

---

### Step 1.4 — Add controller endpoint

File: `backend/src/main/java/com/devopssuite/metrics/controller/MetricsController.java`

```java
@GetMapping("/user-summary")
public ResponseEntity<ApiResponse<UserSummaryResponse>> getUserSummary(
        @AuthenticationPrincipal UserDetails userDetails) {
    UUID userId = ((CustomUserDetails) userDetails).getId();
    UserSummaryResponse summary = metricsService.getUserSummary(userId);
    return ResponseEntity.ok(ApiResponse.success(summary));
}
```

---

### Step 1.5 — Add missing repository query methods

Files: `TaskRepository.java`, `ExecutionRequestRepository.java`

Add Spring Data JPA method signatures (no implementation needed — Spring generates the queries):

```java
// TaskRepository
long countByAssigneeIdAndStatus(UUID assigneeId, TaskStatus status);

// ExecutionRequestRepository
long countByUserIdAndCreatedAtAfter(UUID userId, Instant after);
List<ExecutionRequest> findTop5ByUserIdOrderByCreatedAtDesc(UUID userId);
```

---

## Phase 2 — Frontend

### Step 2.1 — Expose `isAdmin` from `AuthContext`

File: `frontend/src/context/AuthContext.jsx`

Derive `isAdmin` from the roles array in the stored user object and include it in the context value:

```js
// Inside the context provider
const isAdmin = user?.roles?.includes('ROLE_ADMIN') ?? false;

// Add to context value
<AuthContext.Provider value={{ user, token, isAuthenticated, isAdmin, loading, login, logout }}>
```

---

### Step 2.2 — Create `AdminRoute` guard component

File: `frontend/src/components/AdminRoute.jsx` (new file)

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

export default function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  return (
    <ProtectedRoute>
      {isAdmin ? children : <Navigate to="/" replace />}
    </ProtectedRoute>
  );
}
```

---

### Step 2.3 — Wrap `/metrics` route with `AdminRoute`

File: `frontend/src/App.jsx` (or wherever routes are defined)

```jsx
// Before
<Route path="/metrics" element={<ProtectedRoute><MetricsPage /></ProtectedRoute>} />

// After
<Route path="/metrics" element={<AdminRoute><MetricsPage /></AdminRoute>} />
```

---

### Step 2.4 — Hide "Metrics" link in Sidebar for non-admins

File: `frontend/src/components/Sidebar.jsx`

```jsx
const { isAdmin } = useAuth();

// In the nav links list
{isAdmin && (
  <NavLink to="/metrics">
    <BarChartIcon /> Metrics
  </NavLink>
)}
```

---

### Step 2.5 — Split `DashboardPage` into role-conditional views

File: `frontend/src/pages/DashboardPage.jsx`

```jsx
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import UserDashboard from '../components/dashboard/UserDashboard';

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
}
```

The existing dashboard content (stat cards, service health panel, "View Projects" / "View Metrics" buttons) moves into `AdminDashboard` with no functional changes.

---

### Step 2.6 — Create `UserDashboard` component

File: `frontend/src/components/dashboard/UserDashboard.jsx` (new file)

Sections to render:
1. **Stat cards row** — My Open Tasks / My In Progress / My Completed / My Executions (this week)
2. **Recent Executions panel** — table of last 5 executions (language badge, status pill, relative time)
3. **Activity feed** — chronological list of last 10 actions
4. **Quick-action buttons** — "View My Projects" (`/projects`) and "Run Code" (first project's code editor or a selector)

Data source: `GET /api/metrics/user-summary` (called on mount, no auto-refresh needed).

---

### Step 2.7 — Add `getUserSummary` to the metrics API client

File: `frontend/src/api/metricsApi.js`

```js
export const getUserSummary = () =>
  apiClient.get('/metrics/user-summary').then(res => res.data.data);
```

---

## Phase 3 — Verification Checklist

Run through these scenarios after implementation:

| Scenario | Expected result |
|---|---|
| Admin logs in → visits `/` | Sees `AdminDashboard`: platform-wide stat cards + service health panel |
| Admin logs in → visits `/metrics` | Sees full Metrics page with throughput/latency charts |
| Admin logs in → Sidebar | "Metrics" link is visible |
| Member logs in → visits `/` | Sees `UserDashboard`: personal task stats, recent executions, activity feed |
| Member logs in → manually navigates to `/metrics` | Silently redirected to `/` |
| Member logs in → Sidebar | No "Metrics" link |
| Member calls `GET /api/metrics/dashboard` directly | `403 Forbidden` |
| Unauthenticated request to `GET /api/metrics/user-summary` | `401 Unauthorized` |
| `GET /actuator/health` (no token) | `200 OK` |
| `GET /actuator/metrics` (member token) | `403 Forbidden` |
| `GET /actuator/metrics` (admin token) | `200 OK` |

---

## File Change Summary

| File | Change type |
|---|---|
| `security/SecurityConfig.java` | Edit — add requestMatchers rules |
| `metrics/service/MetricsService.java` | Edit — add `getUserSummary()` |
| `metrics/dto/UserSummaryResponse.java` | New — response records |
| `metrics/controller/MetricsController.java` | Edit — add `/user-summary` endpoint |
| `project/repository/TaskRepository.java` | Edit — add `countByAssigneeIdAndStatus` |
| `execution/repository/ExecutionRequestRepository.java` | Edit — add count + findTop5 methods |
| `frontend/src/context/AuthContext.jsx` | Edit — expose `isAdmin` |
| `frontend/src/components/AdminRoute.jsx` | New — role-based route guard |
| `frontend/src/App.jsx` | Edit — wrap `/metrics` with `AdminRoute` |
| `frontend/src/components/Sidebar.jsx` | Edit — conditional "Metrics" link |
| `frontend/src/pages/DashboardPage.jsx` | Edit — branch on `isAdmin` |
| `frontend/src/components/dashboard/AdminDashboard.jsx` | New — extracted from current DashboardPage |
| `frontend/src/components/dashboard/UserDashboard.jsx` | New — personal activity view |
| `frontend/src/api/metricsApi.js` | Edit — add `getUserSummary()` |

---

## Implementation Order

1. **Backend first** (Steps 1.1 → 1.5) — lock the endpoints before touching the UI so there is no window where a member can access admin data.
2. **Frontend AuthContext** (Step 2.1) — `isAdmin` must exist before any component uses it.
3. **AdminRoute + routing** (Steps 2.2 → 2.3) — gate the route.
4. **Sidebar** (Step 2.4) — hide the link.
5. **Dashboard split** (Steps 2.5 → 2.7) — build and wire the new `UserDashboard`.
6. **Verify** against the checklist in Phase 3.
