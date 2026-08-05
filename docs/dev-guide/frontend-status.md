# Frontend Implementation Status

> **Framework:** React (Vite + JSX)  
> **Dev URL:** `http://localhost:5173`  
> **API target:** `http://localhost:8081/api`  
> **WebSocket target:** `ws://localhost:8081/ws`

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
├── .env                        ← API base URL config
├── package.json
└── src/
    ├── App.jsx                 ← Root component, router, provider tree
    ├── main.jsx                ← React DOM entry
    ├── index.css               ← Global styles
    ├── api/                    ← Raw Axios API call functions
    │   ├── client.js           ← Configured Axios instance + interceptors
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
    │   ├── AuthContext.jsx     ← Authentication state, token management
    │   ├── WebSocketContext.jsx← STOMP WebSocket connection
    │   └── NotificationContext.jsx
    ├── hooks/                  ← Custom React hooks
    │   ├── useDebounce.js
    │   ├── useLoading.js
    │   └── useLocalStorage.js
    ├── components/
    │   ├── common/             ← Reusable UI primitives
    │   │   ├── Badge.jsx
    │   │   ├── Button.jsx
    │   │   ├── Card.jsx
    │   │   ├── EmptyState.jsx
    │   │   ├── Input.jsx
    │   │   ├── Modal.jsx
    │   │   ├── Select.jsx
    │   │   └── Spinner.jsx
    │   └── layout/             ← App shell
    │       ├── MainLayout.jsx
    │       ├── Header.jsx
    │       └── Sidebar.jsx
    ├── pages/
    │   ├── Auth/               ← LoginPage, RegisterPage
    │   ├── Dashboard/          ← DashboardPage
    │   ├── Projects/           ← ProjectsPage, ProjectDetailPage
    │   ├── Tasks/              ← TasksPage
    │   ├── CodeEditor/         ← CodeEditorPage
    │   ├── Logs/               ← LogsPage
    │   ├── Metrics/            ← MetricsPage
    │   └── Notifications/      ← NotificationsPage
    ├── services/
    ├── store/                  ← State management (configured but expandable)
    ├── types/                  ← TypeScript-style JSDoc type definitions
    └── utils/                  ← Helper utility functions
```

---

## 2. Pages & Routes

All authenticated routes are wrapped with `ProtectedRoute`. Public routes (`/login`, `/register`) are wrapped with `PublicRoute` (redirects to `/` if already logged in).

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

> All pages are **lazy-loaded** with `React.lazy()` and wrapped in `<Suspense>` for code splitting.

---

## 3. API Layer

Files in `src/api/` — each wraps a group of Axios calls.

### `client.js`
- Configured Axios instance with `baseURL` from `import.meta.env.VITE_API_BASE_URL`
- Request interceptor: attaches `Authorization: Bearer <token>` from localStorage
- Response interceptor: handles 401 token expiry

### `authApi.js`
| Function | Method | Endpoint |
|---|---|---|
| `registerUser(data)` | POST | `/auth/register` |
| `loginUser(data)` | POST | `/auth/login` |
| `getCurrentUser()` | GET | `/auth/me` |

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

### `logApi.js`, `metricsApi.js`, `notificationApi.js`
- Defined; consumption depends on backend scaffold completion.

---

## 4. Services

Files in `src/services/` are higher-level wrappers around the raw API calls, handling business logic like token storage.

| File | Purpose |
|---|---|
| `authService.js` | Calls `authApi`, stores/removes JWT tokens in localStorage |
| `projectService.js` | Orchestrates project and board operations |
| `taskService.js` | Orchestrates task CRUD and board reordering |
| `websocketService.js` | Manages STOMP over SockJS connection lifecycle (connect, subscribe, disconnect) |

---

## 5. Context Providers

Provider tree (outer to inner): `AuthProvider → WebSocketProvider → NotificationProvider`

### `AuthContext.jsx`
- Stores `user`, `isAuthenticated`, `loading` state
- Exposes `login(credentials)`, `logout()`, `register(data)` functions
- On mount: reads token from localStorage, calls `/auth/me` to rehydrate session
- Used by `ProtectedRoute` and all pages needing user identity

### `WebSocketContext.jsx`
- Connects to `ws://localhost:8081/ws` via STOMP/SockJS on user login
- Exposes `subscribe(topic, callback)` and `publish(destination, body)` functions
- Disconnects cleanly on logout

### `NotificationContext.jsx`
- Listens to WebSocket notification topic
- Manages a queue of toast/alert notifications
- Exposes `notifications` list and `dismissNotification(id)` function

---

## 6. Custom Hooks

| Hook | File | Purpose |
|---|---|---|
| `useDebounce(value, delay)` | `useDebounce.js` | Debounces a value by the specified delay (ms) |
| `useLoading()` | `useLoading.js` | Returns `{ loading, withLoading }` helper for async operations |
| `useLocalStorage(key, default)` | `useLocalStorage.js` | Persisted state synced with `localStorage` |

---

## 7. Shared Components

### Common UI (`src/components/common/`)
| Component | Props | Description |
|---|---|---|
| `Button` | `variant`, `size`, `disabled`, `onClick` | Primary, secondary, danger, ghost variants |
| `Input` | `label`, `error`, `type`, `...rest` | Form input with label and validation error display |
| `Select` | `options`, `label`, `error`, `...rest` | Dropdown selector |
| `Modal` | `isOpen`, `onClose`, `title`, `children` | Overlay modal dialog |
| `Card` | `children`, `className` | Padded content container |
| `Badge` | `variant`, `children` | Color-coded status badges |
| `Spinner` | `size` | Loading indicator (sm, md, lg) |
| `EmptyState` | `title`, `message`, `action` | Empty data placeholder with optional CTA |

### Layout (`src/components/layout/`)
| Component | Description |
|---|---|
| `MainLayout` | Shell wrapping `Sidebar + Header + <Outlet>` for protected pages |
| `Sidebar` | Left navigation links (Dashboard, Projects, Metrics, etc.) |
| `Header` | Top bar with user profile menu and notifications icon |

---

## 8. State & Types

- `src/store/` — Structured but expandable; currently local context is the primary state manager.
- `src/types/` — JSDoc-style type definitions for IDE autocompletion (e.g., `Project`, `Task`, `User` shapes).
- `src/utils/` — General-purpose helpers (e.g., date formatting, string manipulation).

---

## 9. Feature Status Summary

| Feature | Pages Involved | API Connected | Status |
|---|---|---|---|
| User Registration | `/register` | `authApi.registerUser` | ✅ Done |
| User Login + JWT | `/login` | `authApi.loginUser` | ✅ Done |
| Auto session restore | App mount | `authApi.getCurrentUser` | ✅ Done |
| Dashboard overview | `/` | — | ✅ Done |
| Projects list | `/projects` | `projectApi.getProjects` | ✅ Done |
| Project detail + boards | `/projects/:id` | `projectApi.getProject`, `getBoards` | ✅ Done |
| Task management | `/projects/:id/tasks` | `taskApi.*` | ✅ Done |
| Code editor + sandbox | `/projects/:id/code` | `codeExecutionApi.*` | ✅ Done |
| Log viewer | `/projects/:id/logs` | `logApi.*` | ⚙️ Page exists; backend scaffold pending |
| Metrics dashboard | `/metrics` | `metricsApi.*` | ⚙️ Page exists; Prometheus data pending |
| Notifications | `/notifications` | WebSocket + `notificationApi` | ⚙️ Context wired; backend scaffold pending |
| WebSocket integration | Global | `websocketService` | ✅ Client wired |
