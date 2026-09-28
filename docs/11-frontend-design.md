# Frontend Design Document

## 1. Technology Stack

- **Framework:** React 18 with JavaScript (JSX) — NOT TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6 (lazy-loaded routes)
- **State Management:** React Context + useReducer / useState
- **HTTP Client:** Axios with JWT interceptors
- **WebSocket:** SockJS + STOMP.js
- **Code Editor:** Monaco Editor
- **Charts:** Recharts
- **UI Framework:** Tailwind CSS
- **Testing:** Jest + React Testing Library + Cypress (e2e tests not yet written)

---

## 2. Project Structure

```
frontend/src/
  api/              - Axios clients per domain (13 files)
  assets/           - SVG icons (NN_name.svg naming convention)
  components/       - Reusable UI components
  context/          - React Context providers (6 contexts)
  hooks/            - Custom React hooks
  pages/            - Route-level page components
  utils/            - Utility functions
  App.jsx
  main.jsx
```

---

## 3. Routing

| Path | Component | Auth | Notes |
|---|---|---|---|
| `/login` | `LoginPage` | No | Public |
| `/register` | `RegisterPage` | No | Public |
| `/forgot-password` | `ForgotPasswordPage` | No | Public — email link flow |
| `/reset-password` | `ResetPasswordPage` | No | Public — token from email link |
| `/auth/github/callback` | `GitHubCallbackPage` | No | GitHub OAuth2 exchange callback |
| `/` | `DashboardPage` | Yes | Role-conditional: admin view vs member view |
| `/projects` | `ProjectsPage` | Yes | List + create projects |
| `/projects/:id` | `ProjectDetailPage` | Yes | Project overview + member management |
| `/projects/:id/tasks` | `TasksPage` | Yes | Kanban board |
| `/projects/:id/code` | `IDEPage` | Yes | Full IDE with file explorer, tabs, preview |
| `/projects/:id/logs` | `LogsPage` | Yes | Real-time log viewer |
| `/admin/users` | `AdminUsersPage` | Yes | **ADMIN only** — manage users and roles |
| `/notifications` | `NotificationsPage` | Yes | Full notification list + tabs |
| `/profile` | `ProfilePage` | Yes | Own profile — avatar, stats, preferences |
| `/users/:userId` | `ProfilePage` | Yes | Public profile view of another user |
| `/editor` | `FullScreenIDEPage` | Yes | Standalone full-screen IDE (no sidebar) |
| `/metrics` | *(redirect)* | Yes | Redirects to `/` — metrics are on Dashboard |

> **Route guard rules:**
> - All authenticated routes are wrapped in a `ProtectedRoute` component. Unauthenticated users are redirected to `/login`.
> - `/admin/users` is wrapped in an additional `AdminRoute` guard. Non-admin users are silently redirected to `/`.
> - `/metrics` is a redirect to `/` — the metrics data is embedded in the admin `DashboardPage`.
> - Public routes (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/github/callback`) are wrapped in `PublicRoute` — authenticated users are redirected to `/`.

---

## 4. Component Hierarchy

```
ThemeProvider
  AuthProvider
    WebSocketProvider
      NotificationProvider
        ProjectsProvider
          EditorProvider
            Router
              App
                PublicRoute
                  LoginPage (LoginForm, GoogleOAuthButton, GitHubOAuthButton)
                  RegisterPage (RegisterForm)
                  ForgotPasswordPage
                  ResetPasswordPage
                  GitHubCallbackPage
                ProtectedRoute
                  MainLayout
                    Header (NotificationBell, UserMenu, ThemeToggle)
                    Sidebar (NavLinks)
                    Routes
                      DashboardPage
                        [ADMIN]  AdminDashboard (StatCards, ServiceHealthPanel, MetricsCharts, QuickLinks)
                        [MEMBER] UserDashboard (StatCards, RecentExecutionsPanel, ActivityFeed, QuickActions)
                      ProjectsPage (ProjectList, ProjectCard, ProjectForm)
                      ProjectDetailPage (ProjectInfo, MemberManagement, InviteForm)
                      TasksPage (KanbanBoard, KanbanColumn, TaskCard, TaskForm, TaskDetailModal)
                      IDEPage
                        FileExplorer (FileTree, NewFileForm)
                        EditorTabs (TabBar)
                        IDEEditor (MonacoEditor, LanguageSelector)
                        IDEOutputPanel (ExecutionHistory, OutputView)
                        PreviewPanel (IframePreview)
                      LogsPage (LogFilters, LogViewer, LogEntry)
                      AdminUsersPage (UserTable, RoleEditor)
                      NotificationsPage (NotificationList, NotificationItem, TabBar)
                      ProfilePage (AvatarSection, AvatarCropModal, UserStats, ActivityHeatmap, NotificationPreferencesGrid, FollowButton)
                      FullScreenIDEPage (no Sidebar wrapper)
```

---

## 5. State Management

### 5.1 AuthContext

Manages authentication state and exposes auth actions.

```js
{
  user: User | null,           // Full user object from /api/auth/me
  token: string | null,        // Access JWT (stored in memory / localStorage)
  isAuthenticated: boolean,
  isAdmin: boolean,            // Derived: roles includes 'ROLE_ADMIN'
  loading: boolean,
  login(credentials),          // POST /api/auth/login
  logout(),                    // POST /api/auth/logout + clear token
  refreshToken(),              // POST /api/auth/refresh
  updateUser(partial),         // Merge partial updates after profile edits
}
```

### 5.2 WebSocketContext

Manages the STOMP/SockJS client lifecycle and topic subscriptions.

```js
{
  connected: boolean,
  stompClient: Client | null,
  subscribe(topic, callback),   // Returns subscription handle
  unsubscribe(topic),
  publish(destination, body),
}
```

- **Auth:** JWT token passed in STOMP CONNECT headers; validated server-side by `StompAuthChannelInterceptor`.
- **Reconnect delay:** 5000ms.

### 5.3 NotificationContext

```js
{
  notifications: Notification[],
  unreadCount: number,
  addNotification(n),
  markAsRead(id),
  markAllAsRead(),
  deleteNotification(id),
  fetchNotifications(),
}
```

WebSocket subscription: `/topic/notifications/{userId}` — pushed by server on new notification events.

### 5.4 EditorContext

Manages state for the IDE pages (`IDEPage`, `FullScreenIDEPage`).

```js
{
  files: FileEntry[],           // Persisted via ideFilesApi
  activeFile: FileEntry | null,
  openTabs: FileEntry[],
  language: string,             // Selected execution language
  output: string,
  isRunning: boolean,
  openFile(file),
  closeTab(file),
  saveFile(file, content),
  deleteFile(file),
  createFile(name, content),
  runCode(projectId),
}
```

### 5.5 ProjectsContext

Caches the list of user projects to avoid redundant API calls across pages.

```js
{
  projects: Project[],
  loading: boolean,
  fetchProjects(),
  addProject(project),
  updateProject(project),
  removeProject(id),
}
```

### 5.6 ThemeContext

```js
{
  theme: 'light' | 'dark',
  toggleTheme(),
}
```

Persisted to `localStorage`. `ThemeProvider` applies a `data-theme` attribute or `dark` class on the root `<html>` element.

---

## 6. API Integration

### 6.1 API Clients (13 files in `frontend/src/api/`)

| File | Purpose |
|---|---|
| `client.js` | Axios base instance — base URL, JWT interceptor, 401 refresh logic |
| `index.js` | Re-exports all API modules |
| `authApi.js` | Login, register, logout, refresh, me, forgot-password, reset-password, Google/GitHub OAuth |
| `adminApi.js` | Admin user listing, role management |
| `projectApi.js` | Project CRUD, member management, board/column operations |
| `taskApi.js` | Task CRUD, status updates, reordering |
| `codeExecutionApi.js` | Submit execution, get result, get history |
| `ideFilesApi.js` | IDE file persistence (create, read, update, delete per project) |
| `logApi.js` | Log search, WebSocket log streaming |
| `metricsApi.js` | Dashboard metrics, user summary, service health |
| `notificationApi.js` | List, mark-as-read, delete notifications |
| `notificationPreferenceApi.js` | Get / update per-user notification preferences |
| `userApi.js` | Public profile, follow/unfollow, profile view count |

### 6.2 Axios Interceptors (in `client.js`)

- **Request interceptor:** Attaches `Authorization: Bearer <token>` to every request.
- **Response interceptor:** On `401`, attempts silent token refresh via `POST /api/auth/refresh`. If refresh fails, clears auth and redirects to `/login`.
- **`X-Project-Id` header:** Injected from the current page URL for log correlation on execution requests.

### 6.3 WebSocket Connection

- **URL:** `/ws`
- **Protocol:** STOMP over SockJS
- **Auth:** JWT token sent in STOMP CONNECT headers
- **Server-side validation:** `StompAuthChannelInterceptor` validates signature and Redis blacklist
- **Reconnect delay:** 5000ms (automatic)

---

## 7. Key Component Details

### 7.1 Kanban Board (`TasksPage`)

- **Columns:** TODO, IN_PROGRESS, IN_REVIEW, DONE (configurable per board)
- **Task movement:** Via context menu or edit modal (drag-and-drop removed)
- **Real-time updates:** WebSocket subscription `/topic/tasks/{projectId}` — server broadcasts granular diffs (`CREATED`, `UPDATED`, `STATUS_CHANGED`, `MOVED`, `DELETED`); frontend applies diffs without full re-fetch
- **Optimistic updates** with rollback on API error

### 7.2 IDE (`IDEPage` + `FullScreenIDEPage`)

The IDE is a full multi-panel development environment — NOT a simple single-file code runner.

**Panels:**
- **FileExplorer** — Left sidebar with a file tree. Supports create, rename, delete. Files are persisted server-side via `ideFilesApi` (scoped per project).
- **EditorTabs** — Tab bar showing open files. Click to switch active file; close individual tabs.
- **IDEEditor** — Monaco Editor instance. Language auto-detected from file extension. Supports syntax highlighting, auto-complete, minimap.
- **IDEOutputPanel** — Shows execution output for the current file. Displays execution history (language badge, status, timing, stdout/stderr).
- **PreviewPanel** — In-browser iframe preview for HTML/CSS files.

**Supported languages (execution):**
| Language | Runtime |
|---|---|
| Python | Python 3.12 |
| JavaScript | Node.js 24 |
| Java | Java 21 |
| C++ | g++ 15 |

**File persistence:** Files are stored via `POST/PUT/DELETE /api/ide/files?projectId={id}`. The `FullScreenIDEPage` (route `/editor`) is a standalone version without the main app sidebar — used as a scratch IDE.

### 7.3 Log Viewer (`LogsPage`)

- **Real-time streaming** via WebSocket `/topic/logs/{projectId}`
- **Filters:** level, service, search query, time range
- **Search:** Calls `GET /api/logs/search` (Elasticsearch query via `LogSearchService`)
- **Auto-scroll** with pause on manual scroll
- **Color-coded** by log level: ERROR=red, WARN=yellow, INFO=green, DEBUG=gray
- **Log fields displayed:** timestamp, level, traceId, service, message, clientIp, userAgent

### 7.4 Notification Bell & NotificationsPage

**NotificationBell (in Header):**
- Badge showing unread count
- Dropdown of recent notifications using compact `NotificationItem` mode
- "See all" link navigates to `/notifications`
- WebSocket subscription for real-time push from `/topic/notifications/{userId}`

**NotificationsPage:**
- All / Unread tabs
- Paginated notification list
- Per-item mark-as-read + delete
- Full `NotificationItem` mode with type-specific SVG icons

**6 notification types:**
| Type | Trigger |
|---|---|
| `TaskAssigned` | Task assigned to user |
| `TaskCompleted` | Task moved to DONE status |
| `TaskReassigned` | Assignee changed on an existing task |
| `ExecutionFailed` | Code execution ended with FAILED / TIMEOUT / OOM_KILLED |
| `ProjectInvited` | User added to a project |
| `MentionedInComment` | User @mentioned in a task comment |

**Email delivery:** `EmailNotificationService` sends per-type HTML email templates. Gated by user notification preferences (in-app × email per type). Graceful no-op when SMTP is unconfigured.

### 7.5 Dashboard Page (`/` — Role-conditional)

The `/` route renders a single `DashboardPage` that switches on `isAdmin` from `AuthContext`.

**Admin view — `AdminDashboard`:**
- Stat cards: Total Projects (platform-wide), Open Tasks, In Progress, Completed
- **Metrics charts** (Recharts): Request Throughput (RPM), Request Latency (p50/p99), Error rate — auto-refresh every 30s
- Service Health panel: PostgreSQL, Redis, Elasticsearch, Docker Engine — UP/DOWN + response time
- Quick-link buttons: "View Projects", "View All Users"
- Data source: `GET /api/metrics/dashboard`

**Member view — `UserDashboard`:**
- Stat cards: My Open Tasks, My In Progress, My Completed, My Executions (this week)
- Recent Code Executions panel: last 5 executions with language badge, status (COMPLETED / FAILED / TIMEOUT), relative timestamp
- Activity feed: last 10 personal actions
- Quick-action buttons: "View My Projects", "Run Code"
- Data source: `GET /api/metrics/user-summary`

> There is no separate `/metrics` page. Metrics are embedded in `AdminDashboard`. The `/metrics` route simply redirects to `/`.

### 7.6 Profile Page (`/profile` + `/users/:userId`)

`/profile` shows the authenticated user's own profile with full edit controls.
`/users/:userId` shows a public read-only profile view of another user.

**Sections:**
- **Avatar:** Preset avatar grid + custom URL input + **AvatarCropModal** (crop + zoom) — saved via `PATCH /api/auth/me`
- **User Stats:** Projects joined, tasks completed, code executions count, join date
- **Activity Heatmap:** GitHub-style contribution grid showing daily activity for the past year
- **Follow / Unfollow button** (on public profiles) — backed by `userApi.js` follow endpoints
- **Profile view count:** Incremented server-side on each visit to `/users/:userId`
- **Notification Preferences Grid:** Toggle grid with in-app × email columns per notification type — saved via `notificationPreferenceApi.js`

### 7.7 Admin Users Page (`/admin/users`)

- Accessible only to users with `ROLE_ADMIN`; guarded by `AdminRoute`
- Table of all users: email, display name, roles, status, join date
- Actions: change user role, deactivate/reactivate account
- Data source: `adminApi.js` → `GET /api/admin/users`, `PUT /api/admin/users/{id}/role`

---

## 8. Dark / Light Theme

`ThemeContext` wraps the entire app (outermost provider). Theme is toggled via a button in the `Header` and persisted to `localStorage`. The `ThemeProvider` applies/removes a `dark` class on `document.documentElement`, which Tailwind's `darkMode: 'class'` strategy uses to activate dark-mode variants.

---

## 9. OAuth2 Flows

### Google OAuth2
- Initiated by a "Sign in with Google" button on `LoginPage` / `RegisterPage`.
- Redirects to Google consent screen; Google redirects back to `/api/auth/oauth2/callback/google`.
- Backend exchanges code, creates/finds the user, returns JWT pair.
- Frontend stores tokens and navigates to `/`.

### GitHub OAuth2
- Initiated by a "Sign in with GitHub" button on `LoginPage` / `RegisterPage`.
- Redirects to GitHub authorization; GitHub redirects to `/auth/github/callback` (frontend route).
- `GitHubCallbackPage` reads the `code` query param, calls `authApi.githubCallback(code)`, stores JWT pair, navigates to `/`.

---

## 10. Password Reset Flow

1. User visits `/forgot-password` and submits their email.
2. Frontend calls `POST /api/auth/forgot-password` — backend sends a time-limited reset link via email.
3. User clicks the link → `/reset-password?token=<uuid>`.
4. `ResetPasswordPage` reads the token from query params, prompts for new password, calls `POST /api/auth/reset-password`.
5. On success, navigates to `/login`.
