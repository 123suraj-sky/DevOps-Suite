# Frontend Implementation Status

> **Framework:** React 18 (Vite + JSX)  
> **Dev URL:** `http://localhost:5173`  
> **API target:** `http://localhost:8081/api`  
> **WebSocket target:** `ws://localhost:8081/ws`  
> **Overall Status:** ✅ Complete (100%)

---

## Table of Contents
1. [Project Structure](#1-project-structure)
2. [Pages & Routes](#2-pages--routes)
3. [API Layer](#3-api-layer)
4. [Services](#4-services)
5. [Context Providers](#5-context-providers)
6. [Custom Hooks](#6-custom-hooks)
7. [Shared Components](#7-shared-components)
8. [State & Types](#8-state--types)
9. [Feature Status Summary](#9-feature-status-summary)

---

## 1. Project Structure

```
frontend/
├── .env                        ← VITE_API_BASE_URL, VITE_WS_URL
├── package.json
└── src/
    ├── App.jsx                 ← Root component, router, provider tree
    ├── main.jsx                ← React DOM entry
    ├── index.css               ← Global Tailwind base styles
    ├── api/                    ← Raw Axios API call functions
    │   ├── client.js           ← Configured Axios instance + JWT interceptors
    │   ├── authApi.js
    │   ├── projectApi.js
    │   ├── taskApi.js
    │   ├── codeExecutionApi.js
    │   ├── logApi.js
    │   ├── metricsApi.js
    │   └── notificationApi.js
    ├── services/               ← Higher-level service wrappers
    │   ├── authService.js
    │   ├── projectService.js
    │   ├── taskService.js
    │   └── websocketService.js
    ├── context/                ← React Context providers
    │   ├── AuthContext.jsx     ← Auth state, token management
    │   ├── WebSocketContext.jsx← STOMP/SockJS connection lifecycle
    │   └── NotificationContext.jsx ← WS notification queue + toast state
    ├── hooks/
    │   ├── useDebounce.js
    │   ├── useLoading.js
    │   └── useLocalStorage.js
    ├── components/
    │   ├── common/
    │   │   ├── Badge.jsx, Button.jsx, Card.jsx
    │   │   ├── EmptyState.jsx, Input.jsx, Modal.jsx
    │   │   ├── Select.jsx, Spinner.jsx
    │   └── layout/
    │       ├── MainLayout.jsx
    │       ├── Header.jsx
    │       └── Sidebar.jsx
    ├── pages/
    │   ├── Auth/               ← LoginPage, RegisterPage
    │   ├── Dashboard/          ← DashboardPage
    │   ├── Projects/           ← ProjectsPage, ProjectDetailPage
    │   ├── Tasks/              ← TasksPage
    │   ├── CodeEditor/         ← CodeEditorPage (Monaco Editor)
    │   ├── Logs/               ← LogsPage (WS + REST)
    │   ├── Metrics/            ← MetricsPage (Recharts)
    │   └── Notifications/      ← NotificationsPage
    ├── store/                  ← Expandable state management
    ├── types/                  ← JSDoc-style type definitions
    └── utils/                  ← Date formatting, string helpers, etc.
```

---

## 2. Pages & Routes

All authenticated routes are wrapped with `ProtectedRoute`. Public routes redirect to `/` if already logged in.

> All pages are **lazy-loaded** with `React.lazy()` + `<Suspense>` for code splitting.

| Route | Component | Auth | Status |
|---|---|---|---|
| `/login` | `LoginPage` | Public | ✅ Done |
| `/register` | `RegisterPage` | Public | ✅ Done |
| `/` | `DashboardPage` | ✅ Protected | ✅ Done |
| `/projects` | `ProjectsPage` | ✅ Protected | ✅ Done |
| `/projects/:id` | `ProjectDetailPage` | ✅ Protected | ✅ Done |
| `/projects/:id/tasks` | `TasksPage` | ✅ Protected | ✅ Done |
| `/projects/:id/code` | `CodeEditorPage` | ✅ Protected | ✅ Done |
| `/projects/:id/logs` | `LogsPage` | ✅ Protected | ✅ Done |
| `/metrics` | `MetricsPage` | ✅ Protected | ✅ Done |
| `/notifications` | `NotificationsPage` | ✅ Protected | ✅ Done |
| `*` | Redirect to `/` | — | ✅ Done |

---

## 3. API Layer

Files in `src/api/` — each wraps a group of Axios calls.

### `client.js`
- Configured Axios instance with `baseURL` from `import.meta.env.VITE_API_BASE_URL`
- Request interceptor: attaches `Authorization: Bearer <token>` from localStorage
- Response interceptor: handles 401 token expiry with auto-refresh loop

### `authApi.js`
| Function | Method | Endpoint |
|---|---|---|
| `registerUser(data)` | POST | `/auth/register` |
| `loginUser(data)` | POST | `/auth/login` |
| `refreshToken(data)` | POST | `/auth/refresh` |
| `logoutUser(data)` | POST | `/auth/logout` |
| `getCurrentUser()` | GET | `/auth/me` |
| `forgotPassword(data)` | POST | `/auth/forgot-password` |
| `resetPassword(data)` | POST | `/auth/reset-password` |

### `projectApi.js`
| Function | Method | Endpoint |
|---|---|---|
| `createProject(data)` | POST | `/api/v1/projects` |
| `getProjects(page, size)` | GET | `/api/v1/projects` |
| `getProject(id)` | GET | `/api/v1/projects/{id}` |
| `updateProject(id, data)` | PUT | `/api/v1/projects/{id}` |
| `deleteProject(id)` | DELETE | `/api/v1/projects/{id}` |
| `addMember(projectId, data)` | POST | `/api/v1/projects/{id}/members` |
| `removeMember(projectId, userId)` | DELETE | `/api/v1/projects/{id}/members/{userId}` |
| `getBoards(projectId)` | GET | `/api/v1/projects/{id}/boards` |
| `createBoard(projectId, data)` | POST | `/api/v1/projects/{id}/boards` |
| `createColumn(projectId, boardId, data)` | POST | `/api/v1/projects/{id}/boards/{boardId}/columns` |

### `taskApi.js`
| Function | Method | Endpoint |
|---|---|---|
| `createTask(data)` | POST | `/api/v1/tasks` |
| `createTaskInBoard(boardId, data)` | POST | `/api/v1/boards/{boardId}/tasks` |
| `getTask(id)` | GET | `/api/v1/tasks/{id}` |
| `updateTask(id, data)` | PUT | `/api/v1/tasks/{id}` |
| `updateTaskStatus(id, status)` | PATCH | `/api/v1/tasks/{id}/status` |
| `deleteTask(id)` | DELETE | `/api/v1/tasks/{id}` |
| `reorderTasks(projectId, boardId, data)` | PUT | `/api/v1/projects/{id}/boards/{boardId}/tasks/reorder` |

### `codeExecutionApi.js`
| Function | Method | Endpoint |
|---|---|---|
| `submitExecution(data)` | POST | `/api/v1/execute` |
| `getExecutionResult(id)` | GET | `/api/v1/execute/{id}` |

### `logApi.js`
| Function | Method | Endpoint |
|---|---|---|
| `getLogs(projectId, params)` | GET | `/api/logs?projectId={id}&...` |
| `searchLogs(query)` | GET | `/api/logs/search?q={query}` |

> Real-time log streaming is handled via WebSocket subscription to `/topic/logs/{projectId}` in `LogsPage`.

### `metricsApi.js`
| Function | Method | Endpoint |
|---|---|---|
| `getHealth()` | GET | `/actuator/health` |
| `getPrometheusMetrics()` | GET | `/actuator/prometheus` |
| `getMetric(name)` | GET | `/actuator/metrics/{name}` |
| `getAllMetrics()` | GET | `/actuator/metrics` |

### `notificationApi.js`
| Function | Method | Endpoint |
|---|---|---|
| `getNotifications(page, size)` | GET | `/api/notifications` |
| `getUnreadCount()` | GET | `/api/notifications/unread-count` |
| `markAsRead(id)` | PUT | `/api/notifications/{id}/read` |
| `markAllAsRead()` | PUT | `/api/notifications/read-all` |
| `deleteNotification(id)` | DELETE | `/api/notifications/{id}` |

---

## 4. Services

| File | Purpose |
|---|---|
| `authService.js` | Calls `authApi`, stores/removes JWT tokens in localStorage |
| `projectService.js` | Orchestrates project and board operations |
| `taskService.js` | Orchestrates task CRUD and board reordering |
| `websocketService.js` | Manages STOMP/SockJS connection lifecycle (connect, subscribe, disconnect) |

---

## 5. Context Providers

Provider tree (outer → inner): `AuthProvider → WebSocketProvider → NotificationProvider`

### `AuthContext.jsx`
- Stores `user`, `isAuthenticated`, `loading` state
- Exposes `login()`, `logout()`, `register()` functions
- On mount: reads token from localStorage, calls `/auth/me` to rehydrate session
- Handles token refresh on 401 via Axios interceptor

### `WebSocketContext.jsx`
- Connects to `ws://localhost:8081/ws` via STOMP/SockJS on user login
- Exposes `subscribe(topic, callback)` and `publish(destination, body)`
- Disconnects cleanly on logout

### `NotificationContext.jsx`
- Subscribes to `/topic/notifications/{userId}` via WebSocket
- Manages a queue of toast/alert notifications
- Exposes `notifications` list and `dismissNotification(id)`

---

## 6. Custom Hooks

| Hook | File | Purpose |
|---|---|---|
| `useDebounce(value, delay)` | `useDebounce.js` | Debounces a value |
| `useLoading()` | `useLoading.js` | Returns `{ loading, withLoading }` for async ops |
| `useLocalStorage(key, default)` | `useLocalStorage.js` | Persisted state synced with localStorage |

---

## 7. Shared Components

### Common UI (`src/components/common/`)
| Component | Props | Description |
|---|---|---|
| `Button` | `variant`, `size`, `disabled`, `onClick` | Primary, secondary, danger, ghost variants |
| `Input` | `label`, `error`, `type`, `...rest` | Form input with label and validation error |
| `Select` | `options`, `label`, `error`, `...rest` | Dropdown selector |
| `Modal` | `isOpen`, `onClose`, `title`, `children` | Overlay modal dialog |
| `Card` | `children`, `className` | Padded content container |
| `Badge` | `variant`, `children` | Color-coded status badges |
| `Spinner` | `size` | Loading indicator (sm, md, lg) |
| `EmptyState` | `title`, `message`, `action` | Empty data placeholder with optional CTA |

### Layout (`src/components/layout/`)
| Component | Description |
|---|---|
| `MainLayout` | Shell wrapping `Sidebar + Header + <Outlet>` |
| `Sidebar` | Left navigation (Dashboard, Projects, Metrics, etc.) |
| `Header` | Top bar with user profile menu and notifications icon |

---

## 8. State & Types

- `src/store/` — Structured but expandable; local context is primary state manager
- `src/types/` — JSDoc-style type definitions for IDE autocompletion (`Project`, `Task`, `User`)
- `src/utils/` — General-purpose helpers (date formatting, string manipulation)

---

## 9. Feature Status Summary

| Feature | Pages Involved | API / WS Connected | Status |
|---|---|---|---|
| User Registration | `/register` | `authApi.registerUser` | ✅ Done |
| User Login + JWT | `/login` | `authApi.loginUser` | ✅ Done |
| Token Refresh | App-wide (interceptor) | `authApi.refreshToken` | ✅ Done |
| Logout + token blacklist | App-wide | `authApi.logoutUser` | ✅ Done |
| Forgot / Reset Password | `/login` | `authApi.forgotPassword`, `resetPassword` | ✅ Done |
| Auto session restore | App mount | `authApi.getCurrentUser` | ✅ Done |
| Dashboard overview | `/` | — | ✅ Done |
| Projects list | `/projects` | `projectApi.getProjects` | ✅ Done |
| Project detail + boards | `/projects/:id` | `projectApi.getProject`, `getBoards` | ✅ Done |
| Kanban drag-and-drop | `/projects/:id/tasks` | `taskApi.*` | ✅ Done |
| Code editor + sandbox | `/projects/:id/code` | `codeExecutionApi.*` | ✅ Done |
| Real-time log viewer | `/projects/:id/logs` | `logApi.*` + WS `/topic/logs/{projectId}` | ✅ Done |
| Metrics dashboard | `/metrics` | `metricsApi.*` (Actuator/Prometheus) | ✅ Done |
| Notification inbox | `/notifications` | `notificationApi.*` | ✅ Done |
| Real-time notifications | Global (Header toast) | WS `/topic/notifications/{userId}` | ✅ Done |
| WebSocket connection | Global | `websocketService`, `WebSocketContext` | ✅ Done |
