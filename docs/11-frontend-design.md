# Frontend Design Document

## 1. Technology Stack

- Framework: React 18 with TypeScript
- Routing: React Router v6
- State Management: React Context + useReducer
- HTTP Client: Axios with interceptors
- WebSocket: SockJS + STOMP.js
- Code Editor: Monaco Editor
- Drag and Drop: react-beautiful-dnd
- Charts: Recharts
- UI Framework: Tailwind CSS
- Testing: Jest + React Testing Library + Cypress

## 2. Project Structure

frontend/src/
  api/          - API client and service calls
  components/   - Reusable UI components
  hooks/        - Custom React hooks
  context/      - React Context providers
  pages/        - Route-level page components
  types/        - TypeScript type definitions
  utils/        - Utility functions
  App.tsx
  index.tsx

## 3. Routing

| Path | Component | Auth | Role |
|---|---|---|---|
| /login | LoginPage | No | Any |
| /register | RegisterPage | No | Any |
| / | DashboardPage | Yes | Any (content varies by role — see §7.6) |
| /projects | ProjectsPage | Yes | Any |
| /projects/:id | ProjectDetailPage | Yes | Any |
| /projects/:id/tasks | TasksPage | Yes | Any |
| /projects/:id/code | CodeEditorPage | Yes | Any |
| /projects/:id/logs | LogsPage | Yes | Any |
| /metrics | MetricsPage | Yes | **ADMIN only** — redirect non-admins to `/` |
| /notifications | NotificationsPage | Yes | Any |

> **Route guard rule:** The `/metrics` route is wrapped in an `AdminRoute` guard component. Any authenticated user without the `ROLE_ADMIN` role who navigates to `/metrics` is silently redirected to `/`. The "Metrics" sidebar link is also hidden from non-admin users (see §4).

## 4. Component Hierarchy

App
  AuthProvider
    WebSocketProvider
      NotificationProvider
        MainLayout
          Header (NotificationBell, UserMenu)
          Sidebar (NavLinks — "Metrics" link rendered only for ADMIN role)
          Routes
            LoginPage (LoginForm)
            RegisterPage (RegisterForm)
            DashboardPage
              [ADMIN]  AdminDashboard (ProjectStatsCards, ServiceHealthPanel, QuickLinks)
              [MEMBER] UserDashboard (PersonalTaskSummary, RecentExecutionsPanel, ActivityFeed, QuickActions)
            ProjectsPage (ProjectList, ProjectForm)
            ProjectDetailPage (ProjectInfo, MemberManagement)
            TasksPage (KanbanBoard, TaskForm, TaskDetail)
            CodeEditorPage (LanguageSelector, CodeEditor, ExecutionPanel)
            LogsPage (LogFilters, LogViewer)
            MetricsPage [ADMIN only] (MetricChart, ServiceHealthPanel, RequestThroughputChart, RequestLatencyChart)
            NotificationsPage (NotificationList)

## 5. State Management

### 5.1 Auth Context
- user: User | null
- token: string | null
- isAuthenticated: boolean
- isAdmin: boolean  ← derived from user.roles; true when roles includes `ROLE_ADMIN`
- loading: boolean
- Actions: LOGIN_SUCCESS, LOGOUT, SET_LOADING

### 5.2 WebSocket Context
- connected: boolean
- stompClient: Client | null
- subscribe(topic, callback)
- unsubscribe(topic)

### 5.3 Notification Context
- notifications: Notification[]
- unreadCount: number
- addNotification(n)
- markAsRead(id)
- markAllAsRead()

## 6. API Integration

### 6.1 Axios Interceptor
- Base URL: /api
- Request interceptor: Add JWT token to Authorization header
- Response interceptor: Handle 401 by redirecting to login

### 6.2 WebSocket Connection
- URL: /ws
- Protocol: STOMP over SockJS
- Auth: JWT token in connect headers
- Reconnect delay: 5000ms

## 7. Key Component Details

### 7.1 Kanban Board
- Columns: TODO, IN_PROGRESS, IN_REVIEW, DONE
- Drag and drop via react-beautiful-dnd
- Optimistic updates with rollback on error
- WebSocket subscription for real-time updates

### 7.2 Code Editor (Monaco)
- Languages: Java, Python, JavaScript
- Features: Syntax highlighting, auto-complete, minimap
- Execution: Submit code, poll for results or WebSocket stream
- History: Past executions with output and timing

### 7.3 Log Viewer
- Real-time streaming via WebSocket /topic/logs/{projectId}
- Filters: level, service, search query, time range
- Auto-scroll with pause on manual scroll
- Color-coded by log level (ERROR=red, WARN=yellow, INFO=green)

### 7.4 Notification Bell
- Badge showing unread count
- Dropdown list of recent notifications
- WebSocket subscription for real-time push
- Click to mark as read and navigate to relevant page

### 7.5 Metrics Dashboard (Admin only)
- Access-guarded by `AdminRoute` — non-admins are redirected away.
- Charts: Line, Bar, Area (Recharts)
- Time ranges: 1h, 6h, 24h, 7d, 30d
- Service health indicators with status colors (PostgreSQL, Redis, Elasticsearch, Docker Engine)
- Request Throughput (RPM) area chart with error overlay
- Request Latency (ms) bar chart with p50 and p99 series
- Auto-refresh every 30 seconds
- Calls `/api/metrics/dashboard` (ADMIN-scoped backend endpoint)

### 7.6 Dashboard Page (Role-conditional content)

The `/` route renders a single `DashboardPage` that switches on `isAdmin` from `AuthContext`:

**Admin view — `AdminDashboard`:**
- Stat cards: Total Projects (platform-wide), Open Tasks (platform-wide), In Progress, Completed
- Service Health panel: PostgreSQL, Redis, Elasticsearch, Docker Engine — each showing UP/DOWN and response time
- Quick-link buttons: "View Projects", "View Metrics"
- Data source: `/api/metrics/dashboard`

**Member view — `UserDashboard`:**
- Stat cards: My Open Tasks, My In Progress, My Completed, My Executions (this week)
- Recent Code Executions panel: last 5 executions with language badge, status (COMPLETED / FAILED / TIMEOUT), and relative timestamp
- Activity feed: last 10 personal actions (task created, task moved to Done, code executed, etc.)
- Quick-action buttons: "View My Projects", "Run Code"
- Data source: `/api/metrics/user-summary`
- No service health, no infrastructure status, no platform-wide counters
