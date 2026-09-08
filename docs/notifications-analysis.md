# Notifications — Full Analysis & Options

> **Read this before touching any notification-related code.**
> This document covers: what is currently built, what is broken, and every available option for expanding the notification system.

---

## Table of Contents

1. [What Exists Right Now](#1-what-exists-right-now)
2. [Known Bugs (Must Fix First)](#2-known-bugs-must-fix-first)
3. [Notification Options](#3-notification-options)
   - [Option A — Fix Real-Time In-App (WebSocket)](#option-a--fix-real-time-in-app-websocket)
   - [Option B — Build the Notifications Inbox Page](#option-b--build-the-notifications-inbox-page)
   - [Option C — Add Email Notifications](#option-c--add-email-notifications)
   - [Option D — STOMP Security (Per-User Topic Auth)](#option-d--stomp-security-per-user-topic-auth)
   - [Option E — Expand Notification Triggers](#option-e--expand-notification-triggers)
   - [Option F — Live Kanban Updates via WebSocket](#option-f--live-kanban-updates-via-websocket)
   - [Option G — User Notification Preferences](#option-g--user-notification-preferences)
   - [Option H — Browser Push Notifications (Web Push API)](#option-h--browser-push-notifications-web-push-api)
4. [Implementation Priority](#4-implementation-priority)
5. [File Map](#5-file-map)

---

## 1. What Exists Right Now

### Backend — Fully Implemented

The backend notification pipeline is complete and correct. Here is the full flow:

```
Service Layer (TaskService / ProjectService)
        │
        │  publishEvent(TaskAssignedEvent | MemberAddedEvent | ...)
        ▼
ApplicationEventPublisher  (in-JVM, no Kafka)
        │
        │  @Async @EventListener
        ▼
NotificationEventListener
        │
        │  notificationService.createNotification(...)
        ▼
NotificationService
        ├── notificationRepository.save(notification)   → PostgreSQL
        └── messagingTemplate.convertAndSend(           → WebSocket
              "/topic/notifications/{userId}", response)
```

#### What triggers a notification today

| Event Class | Type String | Title | Trigger Location |
|---|---|---|---|
| `TaskAssignedEvent` | `TASK_ASSIGNED` | "New Task Assigned" | `TaskService.createTask()` when `assignedTo` is set |
| `MemberAddedEvent` | `PROJECT_JOINED` | "Added to Project" | `ProjectService` on member add |
| `MemberRoleChangedEvent` | `ROLE_CHANGED` | "Project Role Updated" | `ProjectService` on role update |
| `MemberRemovedEvent` | `PROJECT_REMOVED` | "Removed from Project" | `ProjectService` on member remove |

#### REST API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notifications?page=0&size=20` | Paginated inbox |
| `GET` | `/api/notifications/unread-count` | Badge count |
| `PUT` | `/api/notifications/{id}/read` | Mark one as read |
| `PUT` | `/api/notifications/read-all` | Mark all as read |
| `DELETE` | `/api/notifications/{id}` | Delete one |

#### Database

The `notifications` table is Flyway-migrated with indexes on `(user_id)`, `(user_id, read)`, and `(created_at DESC)`. Fields:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `user_id` | UUID FK → users | NOT NULL |
| `type` | VARCHAR(50) | e.g. `TASK_ASSIGNED` |
| `title` | VARCHAR(255) | Short notification title |
| `message` | TEXT | Full notification body |
| `project_id` | UUID FK → projects | Nullable |
| `task_id` | UUID FK → tasks | Nullable |
| `read` | BOOLEAN | Default false |
| `created_at` | TIMESTAMP | Immutable, auto-set |

#### WebSocket Configuration

- Endpoint: `ws://localhost:8081/ws` (SockJS)
- Broker prefix: `/topic`
- Per-user notification topic: `/topic/notifications/{userId}`
- STOMP `connectHeaders` carry `Authorization: Bearer <token>` (sent but not server-validated — see bugs)

#### Frontend — Partial

| Component | Status |
|---|---|
| `WebSocketContext.jsx` | ✅ Connects/disconnects STOMP client on auth state change |
| `NotificationContext.jsx` | ⚠️ Wired but subscribing to the wrong topic (see bugs) |
| `Header.jsx` — bell + dropdown | ✅ Renders correctly; reads from context |
| `notificationApi.js` | ⚠️ HTTP method mismatches (see bugs) |
| `NotificationsPage.jsx` | ❌ Stub — renders only an `<h1>` |

---

## 2. Known Bugs (Must Fix First)

These four bugs mean the notification system does not work end-to-end right now, even though all the backend code is correct.

---

### Bug 1 — Wrong WebSocket topic (Critical)

**File:** `frontend/src/context/NotificationContext.jsx` line ~47

The context subscribes to `/topic/notifications` but the backend broadcasts to `/topic/notifications/{userId}`.
No real-time push notification ever arrives at the frontend.

```js
// CURRENT (broken)
const unsub = subscribe('/topic/notifications', (message) => { ... });

// CORRECT — needs the logged-in user's UUID
const unsub = subscribe(`/topic/notifications/${user.userId}`, (message) => { ... });
```

`user` is available from `useAuth()`. The fix requires importing `useAuth` in `NotificationContext`.

---

### Bug 2 — HTTP method mismatch on mark-as-read (High)

**File:** `frontend/src/api/notificationApi.js` lines 11–14

The frontend sends `PATCH` but the backend controller maps `PUT`. The requests return `405 Method Not Allowed`.

```js
// CURRENT (broken)
markAsRead:    async (id) => apiClient.patch(`/notifications/${id}/read`),
markAllAsRead: async ()   => apiClient.patch('/notifications/read-all'),

// CORRECT
markAsRead:    async (id) => apiClient.put(`/notifications/${id}/read`),
markAllAsRead: async ()   => apiClient.put('/notifications/read-all'),
```

---

### Bug 3 — Broken unread count response parsing (High)

**File:** `frontend/src/api/notificationApi.js` line 8

The backend returns `{ "count": 5 }` directly. The frontend calls `response.data.data` which resolves to `undefined`, so the badge always shows 0.

```js
// CURRENT (broken)
getUnreadCount: async () => {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data.data;  // ← undefined; backend returns { count: N } not { data: { count: N } }
},

// CORRECT
getUnreadCount: async () => {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data.count;
},
```

> **Note:** Verify that other api clients (`getAll`) use `response.data` consistently. If the Axios client has a global response interceptor that unwraps `.data`, adjust accordingly.

---

### Bug 4 — `getAll` not called on mount (Medium)

**File:** `frontend/src/context/NotificationContext.jsx`

`refresh()` only fetches the unread _count_. The `notifications` array in state starts empty and is only populated by incoming WebSocket messages. On a fresh page load the bell dropdown is always empty until a new event fires. The inbox page will always be blank.

The fix is to call `notificationApi.getAll()` on mount (or when the page first renders) and seed the state.

---

## 3. Notification Options

Each option below is independent. They can be done in any order after the bugs in §2 are fixed.

---

### Option A — Fix Real-Time In-App (WebSocket)

**Effort:** Small (4 bugs, ~30 lines of code total)
**Impact:** Makes the existing system actually work end-to-end

Fix all four bugs from §2. No new infrastructure, no new backend code.

**Files to change:**
- `frontend/src/context/NotificationContext.jsx` — fix topic path, add `getAll` on mount
- `frontend/src/api/notificationApi.js` — fix HTTP methods and response parsing

After this fix, the flow is:
1. User logs in → WebSocket connects → `NotificationContext` subscribes to `/topic/notifications/{userId}`
2. Another user assigns a task → `TaskAssignedEvent` fires → `NotificationService.createNotification()` → persisted + broadcast
3. Target user receives WebSocket message → `addNotification()` called → bell badge increments → toast appears

---

### Option B — Build the Notifications Inbox Page

**Effort:** Medium (~150–200 lines of JSX + CSS)
**Impact:** Gives users a dedicated place to read, filter, and manage all notifications

`NotificationsPage.jsx` is currently a stub. The full inbox should include:

- Paginated list of all notifications (calls `GET /api/notifications?page=0&size=20`)
- Unread items highlighted (blue left border or background tint)
- Filter tabs: **All** / **Unread**
- Per-item actions: mark as read, delete
- Bulk action: "Mark all as read" button
- Empty state illustration + message when no notifications exist
- Infinite scroll or "Load more" pagination

**Backend is ready** — no changes needed there. This is purely a frontend task.

**Suggested component structure:**
```
NotificationsPage.jsx
└── NotificationList.jsx
    └── NotificationItem.jsx   (title, message, relative time, read/unread state, actions)
```

Each `NotificationItem` should render an SVG icon based on the `type` field:

| Type | Icon suggestion |
|---|---|
| `TASK_ASSIGNED` | task/checklist icon |
| `PROJECT_JOINED` | folder/project icon |
| `ROLE_CHANGED` | shield/role icon |
| `PROJECT_REMOVED` | warning/removed icon |

Place SVG files in `frontend/src/assets/` following the `NN_name.svg` convention (per `AGENTS.md`).

---

### Option C — Add Email Notifications

**Effort:** Medium-Large (~200–300 lines backend + config)
**Impact:** Users receive notifications even when not logged in; important for async workflows

#### Infrastructure already in place

- `spring-boot-starter-mail` is already in `pom.xml`
- `JavaMailSender` is already configured and used in `AuthService` for password reset emails
- SMTP env vars are documented in `.env.example`: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`

#### What needs to be built

**1. `EmailNotificationService.java`** in `notification/service/`

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@devopssuite.local}")
    private String from;

    public void sendNotificationEmail(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", toEmail, e.getMessage());
        }
    }
}
```

**2. Inject into `NotificationEventListener`** alongside the existing in-app notification calls

```java
// Inject both services
private final NotificationService notificationService;
private final EmailNotificationService emailNotificationService;
private final UserRepository userRepository;  // to look up email address

@Async
@EventListener
public void onTaskAssigned(TaskAssignedEvent event) {
    // existing in-app notification (unchanged)
    notificationService.createNotification(...);

    // new: also send email
    userRepository.findById(event.assigneeId()).ifPresent(user -> {
        emailNotificationService.sendNotificationEmail(
            user.getEmail(),
            "New Task Assigned: " + event.taskTitle(),
            "You have been assigned to task '" + event.taskTitle() + "' in your project."
        );
    });
}
```

**3. For dev/testing** use [Mailtrap](https://mailtrap.io) — a free SMTP sandbox that captures emails without sending them. Set `.env`:

```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<your-mailtrap-user>
MAIL_PASSWORD=<your-mailtrap-password>
MAIL_FROM=noreply@devopssuite.local
```

**4. For production** replace with SendGrid, SES, or any real SMTP provider.

#### Optional: HTML email templates

Use `MimeMessageHelper` instead of `SimpleMailMessage` for HTML emails. Thymeleaf template engine is not currently in `pom.xml` but can be added as `spring-boot-starter-thymeleaf`. Without Thymeleaf, inline HTML string templates work fine for a portfolio project.

---

### Option D — STOMP Security (Per-User Topic Auth)

**Effort:** Small-Medium (~50–80 lines backend)
**Impact:** Closes the WebSocket security gap — currently any connected user could subscribe to `/topic/notifications/{anyUserId}`

#### The gap

`SecurityConfig` allows `/ws/**` at the HTTP level for the SockJS handshake. After the WebSocket upgrade, the STOMP `CONNECT` frame carries the JWT in its headers, but there is no `ChannelInterceptor` that validates it. The `notification/security/` directory exists but is empty — it was a placeholder for this.

#### The fix

Create `StompAuthChannelInterceptor.java` in `notification/security/`:

```java
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtUtils jwtUtils;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
                message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (!jwtUtils.validateToken(token)) {
                    throw new MessagingException("Invalid or expired JWT");
                }
                String userId = jwtUtils.getClaims(token).getSubject();
                accessor.setUser(() -> userId);  // attach principal to STOMP session
            }
        }
        return message;
    }
}
```

Register it in `WebSocketConfig`:

```java
@Override
public void configureClientInboundChannel(ChannelRegistration registration) {
    registration.interceptors(stompAuthChannelInterceptor);
}
```

This makes the STOMP session authenticated, so you can also use `SimpMessagingTemplate.convertAndSendToUser()` instead of constructing the topic path manually — which is cleaner and more secure.

---

### Option E — Expand Notification Triggers

**Effort:** Small per trigger (~10–15 lines each)
**Impact:** More useful, event-driven notifications across the platform

The current triggers only fire on task creation (with assignee) and membership changes. These are the gaps:

#### 1. Task reassigned

When an existing task's `assignee_id` is changed via `PUT /api/v1/tasks/{taskId}`, no event is published. Add to `TaskService.updateTask()`:

```java
if (updatedTask.getAssigneeId() != null &&
    !updatedTask.getAssigneeId().equals(oldAssigneeId)) {
    eventPublisher.publishEvent(new TaskAssignedEvent(
        updatedTask.getId(),
        updatedTask.getAssigneeId(),
        updatedTask.getProjectId(),
        updatedTask.getTitle()
    ));
}
```

#### 2. Task status moved to Done

```java
// In TaskService.updateTask() or a dedicated moveTask() method
if ("DONE".equals(newStatus) && !newStatus.equals(oldStatus)) {
    eventPublisher.publishEvent(new TaskCompletedEvent(
        task.getId(), task.getProjectId(), task.getTitle(), task.getAssigneeId()
    ));
}
```

New event record `TaskCompletedEvent` and a new handler in `NotificationEventListener`:

```java
@Async
@EventListener
public void onTaskCompleted(TaskCompletedEvent event) {
    // Notify the project owner/admins that a task was completed
    notificationService.createNotification(
        event.ownerId(), "TASK_COMPLETED", "Task Completed",
        "Task '" + event.taskTitle() + "' has been marked as done.",
        event.projectId(), event.taskId()
    );
}
```

#### 3. Code execution failed / timed out

After an execution finishes with `FAILED`, `TIMEOUT`, or `OOM_KILLED` status, notify the submitting user. Publish from `ExecutionService` after result is set:

```java
if (result.getStatus() == ExecutionStatus.TIMEOUT ||
    result.getStatus() == ExecutionStatus.OOM_KILLED ||
    result.getStatus() == ExecutionStatus.FAILED) {
    eventPublisher.publishEvent(new ExecutionFailedEvent(
        result.getId(), userId, result.getStatus()
    ));
}
```

Handler type: `EXECUTION_FAILED` — "Your code execution timed out / ran out of memory."

#### 4. New comment on a task (future feature)

If a comment system is added, notify the task assignee and task creator when someone comments.

#### Summary table of all proposed types

| Type | Trigger | Who Gets It |
|---|---|---|
| `TASK_ASSIGNED` ✅ | Task created with assignee | Assignee |
| `TASK_REASSIGNED` | Task updated, assignee changed | New assignee |
| `TASK_COMPLETED` | Task moved to Done column | Project owner/admins |
| `PROJECT_JOINED` ✅ | Added as a member | New member |
| `ROLE_CHANGED` ✅ | Member role updated | Affected member |
| `PROJECT_REMOVED` ✅ | Removed from project | Removed member |
| `EXECUTION_FAILED` | Execution timed out or OOM killed | Submitting user |

---

### Option F — Live Kanban Updates via WebSocket

**Effort:** Medium (~80 lines backend + 40 lines frontend)
**Impact:** Multiple users on the same Kanban board see task moves in real time without refreshing

The topic `/topic/tasks/{projectId}` is already subscribed on the frontend (`TasksPage.jsx`) but the backend never publishes to it. This is a dead wire.

#### Backend

Inject `SimpMessagingTemplate` into `TaskService` and broadcast after every mutating operation:

```java
// In TaskService, after any task create/update/move/delete
messagingTemplate.convertAndSend(
    "/topic/tasks/" + task.getProjectId(),
    new TaskUpdateDto(task.getId(), task.getColumnId(), task.getPosition(), "MOVED")
);
```

A `TaskUpdateDto` with an `action` field (`CREATED`, `UPDATED`, `MOVED`, `DELETED`) lets the frontend decide what to do.

#### Frontend

`TasksPage.jsx` already has the subscription but currently does nothing with it. Add a handler that updates the local task state when a message arrives:

```js
useEffect(() => {
  if (!connected || !projectId) return;
  const unsub = subscribe(`/topic/tasks/${projectId}`, (update) => {
    // update local tasks state based on update.action
    if (update.action === 'MOVED') {
      setColumns(prev => applyTaskMove(prev, update));
    }
  });
  return unsub;
}, [connected, projectId]);
```

This is separate from notifications — it uses a different topic and updates the board UI directly rather than adding a toast.

---

### Option G — User Notification Preferences

**Effort:** Medium-Large (~200 lines backend + ~100 lines frontend)
**Impact:** Users can control which notification types they receive and via which channels

#### Backend

Add a `notification_preferences` table:

```sql
-- Flyway V{next}__add_notification_preferences.sql
CREATE TABLE notification_preferences (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    type        VARCHAR(50) NOT NULL,
    in_app      BOOLEAN NOT NULL DEFAULT TRUE,
    email       BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(user_id, type)
);
```

`NotificationService.createNotification()` checks preferences before persisting/emailing:

```java
NotificationPreference pref = preferenceRepository
    .findByUserIdAndType(userId, type)
    .orElse(defaultPreference);

if (pref.isInApp()) {
    // persist + WebSocket push (current behavior)
}
if (pref.isEmail()) {
    // call EmailNotificationService
}
```

New REST endpoints under `/api/notifications/preferences`:
- `GET /api/notifications/preferences` — list all preferences for the current user
- `PUT /api/notifications/preferences/{type}` — update a preference

#### Frontend

A preferences section on the Profile page or a dedicated `/settings/notifications` page with toggles per notification type.

---

### Option H — Browser Push Notifications (Web Push API)

**Effort:** Large (~300+ lines, new dependency)
**Impact:** Users receive notifications even when the browser tab is closed

This uses the [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) with a Service Worker. It is the most complex option and requires new infrastructure.

#### How it works

1. On first login, the frontend requests push permission from the browser
2. The browser returns a `PushSubscription` object (endpoint + keys)
3. The frontend saves this subscription to the backend via a new `POST /api/notifications/push-subscriptions` endpoint
4. The backend stores push subscriptions in a new `push_subscriptions` table
5. When `NotificationService.createNotification()` fires, it also sends a Web Push payload using a library like `nl.martijndwars:web-push` (Java)
6. The browser's push service delivers the notification to the browser even if the tab is closed
7. A Service Worker in the frontend intercepts the push event and shows the browser notification

#### Dependencies

- Backend: `nl.martijndwars:web-push:5.x` (add to `pom.xml`)
- Frontend: `web-push` browser APIs (no npm package needed — native browser API)
- A VAPID key pair (generated once, stored in `.env` as `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`)

#### Recommendation

Web Push is the most work and adds the most infrastructure complexity. For a portfolio project it's impressive but optional. Implement Options A–C first; Web Push can be a stretch goal.

---

## 4. Implementation Priority

Based on effort vs. impact for a portfolio-quality project:

| Priority | Option | Why |
|---|---|---|
| 🔴 Must do | **A — Fix WebSocket bugs** | Nothing works without this. 4 simple code fixes. |
| 🔴 Must do | **B — Build Notifications Page** | The page is a stub. It's a core feature. |
| 🟡 Should do | **C — Email Notifications** | Infrastructure already exists (`JavaMailSender` is in the project). High value, medium effort. |
| 🟡 Should do | **E — Expand Triggers** | Task reassign and execution failures are obvious gaps. Low effort per trigger. |
| 🟡 Should do | **F — Live Kanban Updates** | The wire is already laid on both ends. Mostly backend plumbing. |
| 🟢 Nice to have | **D — STOMP Auth** | Closes a real security gap. Worth doing alongside C or E. |
| 🟢 Nice to have | **G — Preferences** | Good portfolio feature; needs a migration and new endpoints. |
| ⚪ Stretch | **H — Browser Push** | Most complex. Do last if at all. |

---

## 5. File Map

All notification-related files in the project:

### Backend

| File | Purpose |
|---|---|
| `notification/model/Notification.java` | JPA entity → `notifications` table |
| `notification/dto/NotificationDto.java` | `NotificationResponse` and `UnreadCountResponse` records |
| `notification/repository/NotificationRepository.java` | JPA queries incl. bulk `markAllRead` |
| `notification/service/NotificationService.java` | Core service: persist + WebSocket broadcast |
| `notification/controller/NotificationController.java` | REST endpoints (GET, PUT, DELETE) |
| `notification/event/NotificationEventListener.java` | Spring Event → notification bridge |
| `notification/event/TaskAssignedEvent.java` | Event record for task assignment |
| `notification/event/MemberAddedEvent.java` | Event record for member addition |
| `notification/event/MemberRemovedEvent.java` | Event record for member removal |
| `notification/event/MemberRoleChangedEvent.java` | Event record for role change |
| `notification/security/` | **Empty** — placeholder for STOMP `ChannelInterceptor` (Option D) |
| `notification/config/` | **Empty** — placeholder for future notification config |
| `notification/consumer/` | **Empty** — placeholder (was for Kafka; Kafka removed) |
| `notification/websocket/` | **Empty** — placeholder for WebSocket-specific logic |
| `config/WebSocketConfig.java` | STOMP broker, SockJS endpoint, topic/app prefixes |
| `project/service/ProjectService.java` | Publishes `MemberAdded/Removed/RoleChanged` events |
| `project/service/TaskService.java` | Publishes `TaskAssignedEvent` on task create |

### Frontend

| File | Purpose |
|---|---|
| `src/context/WebSocketContext.jsx` | Manages STOMP client lifecycle (connect/disconnect) |
| `src/context/NotificationContext.jsx` | Notification state, WebSocket subscription, REST calls |
| `src/services/websocketService.js` | Low-level STOMP wrapper: connect, subscribe, send, disconnect |
| `src/api/notificationApi.js` | Axios calls for notification REST endpoints |
| `src/components/layout/Header.jsx` | Bell icon, badge, dropdown (inline, not a separate component) |
| `src/pages/Notifications/NotificationsPage.jsx` | **Stub** — needs full implementation (Option B) |
| `src/assets/09_notification_bell.svg` | Bell icon used in `Header.jsx` |

### Database

| File | Purpose |
|---|---|
| `backend/src/main/resources/db/migration/V{n}__*.sql` | Flyway migration that creates the `notifications` table |

### Docs

| File | Purpose |
|---|---|
| `docs/04-api-design.md` §5 | Notification REST API contracts |
| `docs/05-lld-detailed-design.md` | Notification service class design |
| `docs/11-frontend-design.md` | Frontend component design for notifications |
| `docs/notifications-analysis.md` | **This file** |
