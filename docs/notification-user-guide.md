# Notification User Guide

> What triggers a notification, who receives it, and what it says.

---

## How notifications are delivered

Every notification is delivered through **two channels**:

| Channel | How it works | Default |
|---|---|---|
| **In-app** | Bell icon in the header updates its badge count. A toast/dropdown item appears instantly without refreshing the page. All notifications are also stored in the **Notifications inbox** (`/notifications`). | **On** |
| **Email** | An HTML email is sent to the user's registered email address. | **Off** — user must opt in from **Profile → Notification Preferences** |

Users can independently toggle in-app and email for each notification type from their profile page.

---

## Notification types

### 1. Task Assigned — `TASK_ASSIGNED`

**Who gets it:** The user who was assigned to the task.

**When it fires:** A new task is created and an assignee is selected at creation time.

**What the notification says:**
- Title: `New Task Assigned`
- Message: `You have been assigned to task: {task title}`

**Email subject:** `New Task Assigned: {task title}`

---

### 2. Task Reassigned — `TASK_REASSIGNED`

**Who gets it:** The new assignee.

**When it fires:** An existing task is edited and its assignee is changed to a different person. Only the **new** assignee is notified — the previous one is not.

**What the notification says:**
- Title: `Task Reassigned to You`
- Message: `Task '{task title}' has been reassigned to you.`

**Email subject:** `Task Reassigned to You: {task title}`

---

### 3. Task Completed — `TASK_COMPLETED`

**Who gets it:** The task's assignee. If the task has no assignee, the person who moved it to Done is notified instead.

**When it fires:** A task's status is changed to **Done** — either by:
- Dragging the card into the Done column on the Kanban board
- Using the status dropdown on the task
- Editing the task and selecting Done as the status

**What the notification says:**
- Title: `Task Completed`
- Message: `Task '{task title}' has been marked as done.`

**Email subject:** `Task Completed: {task title}`

---

### 4. Added to Project — `PROJECT_JOINED`

**Who gets it:** The user who was added to the project.

**When it fires:** A project owner or admin adds a new member to the project.

**What the notification says:**
- Title: `Added to Project`
- Message: `You have been added to project '{project name}' as {role}`
  - Example: `You have been added to project 'Platform Backend' as MEMBER`

**Email subject:** `You've been added to project: {project name}`

---

### 5. Role Changed — `ROLE_CHANGED`

**Who gets it:** The member whose role was changed.

**When it fires:** A project owner or admin changes an existing member's role (e.g. MEMBER → ADMIN).

**What the notification says:**
- Title: `Project Role Updated`
- Message: `Your role in project '{project name}' has been updated to {new role}`
  - Example: `Your role in project 'Platform Backend' has been updated to ADMIN`

**Email subject:** `Your role has changed in: {project name}`

---

### 6. Removed from Project — `PROJECT_REMOVED`

**Who gets it:** The member who was removed.

**When it fires:** A project owner or admin removes a member from the project.

**What the notification says:**
- Title: `Removed from Project`
- Message: `You have been removed from project '{project name}'`

**Email subject:** `You've been removed from: {project name}`

---

### 7. Code Execution Failed — `EXECUTION_FAILED`

**Who gets it:** The user who submitted the code for execution.

**When it fires:** A sandboxed code execution ends in one of these terminal states:
- `FAILED` — a system-level error prevented the code from running
- `TIMEOUT` — the code exceeded the allowed execution time limit
- `OOM_KILLED` — the code exceeded the memory limit and the container was killed

> **Note:** A non-zero exit code (e.g. a Python exception or compile error) does **not** trigger this notification — that is considered a user code error, not an infrastructure failure. The notification is for infrastructure-level failures only.

**What the notification says:**
- Title: `Code Execution Failed`
- Message: `Your code execution ended with status: {FAILED | TIMEOUT | OOM_KILLED}`

**Email subject:** `Code Execution Failed ({FAILED | TIMEOUT | OOM_KILLED})`

---

## Managing your preferences

Go to **Profile → Notification Preferences** to see the full list of types with toggles for each channel.

| Setting | What it does |
|---|---|
| In-app toggle **off** | The notification is not stored and the bell badge does not update for that type |
| Email toggle **on** | An HTML email is sent to your registered address for that type |

Changes take effect immediately — no page reload needed.

---

## Where to read notifications

| Location | What you see |
|---|---|
| **Bell icon (header)** | Up to 10 most recent notifications. Badge shows unread count (capped at `9+`). Click any item to mark it as read. "Mark all read" button clears the badge. |
| **Notifications page** (`/notifications`) | Full paginated inbox. Filter between All and Unread. Mark individual items as read or delete them. Load older notifications with "Load more". |
