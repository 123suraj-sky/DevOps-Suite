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

| Path | Component | Auth |
|---|---|---|
| /login | LoginPage | No |
| /register | RegisterPage | No |
| / | DashboardPage | Yes |
| /projects | ProjectsPage | Yes |
| /projects/:id | ProjectDetailPage | Yes |
| /projects/:id/tasks | TasksPage | Yes |
| /projects/:id/code | CodeEditorPage | Yes |
| /projects/:id/logs | LogsPage | Yes |
| /metrics | MetricsPage | Yes |
| /notifications | NotificationsPage | Yes |

## 4. Component Hierarchy

App
  AuthProvider
    WebSocketProvider
      NotificationProvider
        MainLayout
          Header (NotificationBell, UserMenu)
          Sidebar (NavLinks)
          Routes
            LoginPage (LoginForm)
            RegisterPage (RegisterForm)
            DashboardPage (ProjectList, MetricsSummary)
            ProjectsPage (ProjectList, ProjectForm)
            ProjectDetailPage (ProjectInfo, MemberManagement)
            TasksPage (KanbanBoard, TaskForm, TaskDetail)
            CodeEditorPage (LanguageSelector, CodeEditor, ExecutionPanel)
            LogsPage (LogFilters, LogViewer)
            MetricsPage (MetricChart, ServiceHealthPanel)
            NotificationsPage (NotificationList)

## 5. State Management

### 5.1 Auth Context
- user: User | null
- token: string | null
- isAuthenticated: boolean
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

### 7.5 Metrics Dashboard
- Charts: Line, Bar, Area (Recharts)
- Time ranges: 1h, 6h, 24h, 7d, 30d
- Service health indicators with status colors
- Auto-refresh every 30 seconds
