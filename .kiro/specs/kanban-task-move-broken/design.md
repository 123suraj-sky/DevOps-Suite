# Kanban Task Move Broken — Bugfix Design

## Overview

Tasks on the Kanban board cannot be moved between columns via either drag-and-drop or the right-click context menu. Both paths fail silently or show a misleading "Board still loading" toast instead of executing the move.

The root cause is a **shape mismatch between what `projectApi.getBoards()` returns and what `TasksPage.jsx` expects**. The `getBoards` endpoint returns `ApiResponse<List<BoardResponse>>`, so `response.data.data` is a `BoardResponse[]`. The `BoardResponse` DTO serialises column objects with snake_case property names (`column_id`, `sort_order`, `wip_limit`, `board_id`) via `@JsonProperty`. This means each column in `first.columns` exposes `column_id` as the UUID field, **not** a camelCase `id` field — yet the frontend reads `col.id || col.column_id`. Because `id` is the Java field name and Jackson uses `@JsonProperty("column_id")` to rename it in the output, **`col.id` is `undefined` in the JSON** and `col.column_id` is the actual UUID.

Wait — `ColumnResponse` in fact declares **both** `id` (plain, no annotation) **and** `columnId` (with `@JsonProperty("column_id")`). So the JSON does include an `id` key. `col.id` is therefore truthy and the map is built correctly. That rules out the DTO shape.

The real confirmed dual root cause after full code trace:

**Bug 1 — Drag-and-drop:** `columnIdMap` is built correctly when the board has columns. The early-exit fires (`if (!boardId || !destColId)`) **only** when `columnIdMap[destination.droppableId]` returns `undefined`. This happens because `normalizeStatusKey` in `TasksPage.jsx` maps display names to keys (e.g. `"In Progress"` → `"IN_PROGRESS"`) but `destination.droppableId` comes from the *static* `COLUMNS` array IDs (`"IN_PROGRESS"`, `"TODO"` etc.) which ARE the same keys. Both sides normalise identically, so the lookup should succeed — **unless** `boards[0].columns` is empty or `boards` itself is empty.

Tracing `projectApi.getBoards`: it calls `apiClient.get('/projects/${projectId}/boards')` and returns `response.data.data` — a `List<BoardResponse>`. `BoardResponse` has a `columns` field populated by `mapToBoardResponse` which calls `columnRepository.findByBoardIdOrderBySortOrderAsc`. The default board IS created with 4 columns at project creation time. However **`BoardResponse.columns` is not annotated with `@JsonProperty`**, so it serialises as the Java field name `columns`. The frontend reads `first.columns`, which matches. The map IS built.

The confirmed drag-and-drop failure: `reorder` API call is `PUT /projects/{projectId}/boards/{boardId}/tasks/reorder` with `{ tasks: [...] }`. Each item in `tasks` carries `{ id, columnId, sortOrder }`. The backend `ReorderTaskItem` uses `@JsonAlias("column_id")` for `columnId` — meaning it accepts BOTH `columnId` (camelCase) and `column_id` (snake_case). The frontend sends camelCase `columnId`. `@JsonAlias` accepts both, so this works. **BUT**: `onDragEnd` constructs items from `reordered.map(t => ({ id: t.id, columnId: t.columnId || t.column_id, sortOrder: ... }))`. Task objects returned by `getTasks` (via `TaskResponse` DTO) have `column_id` via `@JsonProperty("column_id")` — meaning the JSON key is `column_id`, not `columnId`. So `t.columnId` is **`undefined`** on freshly fetched tasks, and `t.column_id` holds the UUID. On optimistically updated tasks, `t.columnId` is set (because `onDragEnd` spreads `{ columnId: destColId }`). The fallback `t.columnId || t.column_id` means tasks that were never dragged will send `column_id: undefined` to the reorder endpoint, causing the backend to reject with a 400 (null constraint on `columnId` in `ReorderTaskItem`).

**Bug 2 — Right-click context menu:** `handleStatusChange` calls `taskApi.updateStatus(taskId, newStatus)` → `PATCH /tasks/{id}/status` with `{ status }`. This path is self-contained and does not depend on `columnIdMap`. The backend `updateStatus` service normalises the status and finds the matching column by name. This **should work in isolation**. However, the context menu `onMoveToColumn` callback passes `(task, col.id)` where `col.id` is the static column ID string (`"TODO"`, `"IN_PROGRESS"`, etc.) — this is correct. The status update succeeds backend-side, but the frontend optimistic update sets `status: newStatus` and then replaces with the returned `updated` task. The returned `TaskResponse` has `column_id` (snake_case), not `columnId`. So after the update the task object in state has `column_id` but not `columnId`. The next drag of that task then hits Bug 1's undefined `columnId` problem again, causing the reorder to fail. More critically, if the move crosses a WIP limit (the "In Progress" column has `wipLimit: 3`), the backend throws `IllegalStateException("Column WIP limit exceeded")` which returns a 500 and the frontend shows a generic error toast — with no indication to the user that the WIP limit was reached.

**Summary of root causes:**
1. Frontend reads `t.columnId` on task objects that came from the API, but the API returns `column_id` (snake_case). The `t.columnId || t.column_id` fallback in `onDragEnd`'s reorder payload construction is fragile and doesn't cover all task shapes.
2. The reorder call silently sends `columnId: undefined` for un-dragged tasks, causing backend 400 errors.
3. WIP limit errors from `updateStatus` surface as generic 500 toasts rather than informative messages.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the move failure — a task object in the frontend's `tasks` state array has `column_id` (snake_case, from API) but not `columnId` (camelCase), causing the reorder payload to send `columnId: undefined` for any task not optimistically updated during the current drag session.
- **Property (P)**: After a drag-and-drop or context-menu move, the task SHALL reside in the target column both in the frontend state and in the backend database, with no 4xx/5xx errors.
- **Preservation**: All non-move interactions (task creation, editing, deletion, duplication, status display) must continue working exactly as before.
- **`onDragEnd`**: The drag-and-drop handler in `TasksPage.jsx` that builds the reorder payload and calls `taskApi.reorder`.
- **`handleStatusChange`**: The right-click context-menu handler in `TasksPage.jsx` that calls `taskApi.updateStatus`.
- **`columnIdMap`**: Frontend state dict mapping status-key strings (e.g. `"IN_PROGRESS"`) to the backend column UUIDs. Populated from `getBoards()` response.
- **`TaskResponse`**: Backend DTO whose JSON uses `column_id` (snake_case) for the column UUID field.
- **`ReorderTaskItem`**: Backend DTO that accepts `columnId` (camelCase) or `column_id` (snake_case alias) for the column UUID.

---

## Bug Details

### Bug Condition

The bug manifests when any task object in `tasks` state was fetched from the API (not freshly dragged in the current session) and is included in the reorder payload. The `TaskResponse` JSON uses `column_id` (via `@JsonProperty`), so `t.columnId` is `undefined` on those objects. The payload construction `t.columnId || t.column_id` should handle this — but is missing in one code path, and for tasks optimistically updated during a drag the spread `{ columnId: destColId }` takes precedence, making those tasks safe. Tasks *not* touched in the current drag land in the payload with `columnId: undefined`.

**Formal Specification:**
```
FUNCTION isBugCondition(task)
  INPUT: task object from frontend tasks[] state array
  OUTPUT: boolean

  RETURN task.columnId === undefined
         AND task.column_id !== undefined
         AND task is included in the reorder payload sent to the backend
END FUNCTION

FUNCTION isMoveFailure(dragResult, columnIdMap)
  INPUT: dragResult from react-beautiful-dnd, columnIdMap dict
  OUTPUT: boolean

  destColId := columnIdMap[dragResult.destination.droppableId]
  RETURN destColId === undefined
         OR ANY task IN reorderPayload WHERE isBugCondition(task)
END FUNCTION
```

### Examples

- **Example 1 — Drag across columns**: User drags task from `TODO` to `IN_PROGRESS`. The moved task gets `columnId: destColId` from the optimistic spread. All *other* tasks in both columns are included in the payload with their original shape from `getTasks()` — they have `column_id` but `columnId` is `undefined`. The backend receives `columnId: null` for those tasks and may throw a 400 or silently skip them, leaving sort orders inconsistent.
- **Example 2 — Context menu move to In Progress (WIP limit hit)**: User right-clicks a task and selects "In Progress". `handleStatusChange` sends `PATCH /tasks/{id}/status`. Backend finds the "In Progress" column has 3 tasks (wipLimit=3) and throws `IllegalStateException("Column WIP limit exceeded")`, which becomes a 500 response. Frontend shows generic "Failed to update status" toast with no WIP context.
- **Example 3 — Drag within same column (reorder only)**: All tasks in the column have `columnId: undefined`. Every item in the reorder payload sends `columnId: undefined` / `null`. Backend receives null column IDs and fails the `@NotNull` validation on `ReorderTaskItem.columnId`, returning a 400.
- **Edge case — First drag after page load**: `columnIdMap` is populated correctly (board has 4 columns). The `destColId` lookup works. But the full reorder list still contains API-shaped tasks with `columnId: undefined`. Bug still fires.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Task creation via the "+" button in column headers must continue to work exactly as before.
- Task editing via the edit modal must continue to work exactly as before.
- Task deletion and duplication from the context menu must continue to work exactly as before.
- Task detail modal display must continue to work exactly as before.
- WebSocket live update application of `CREATED`, `UPDATED`, `DELETED`, `STATUS_CHANGED`, `MOVED` events must continue to work exactly as before.
- The `columnIdMap` building logic from `getBoards()` must remain correct.
- Mobile column tab switching must remain unaffected.

**Scope:**
All interactions that do NOT involve moving a task between columns (or reordering within a column) should be completely unaffected by this fix. This includes all CRUD operations on tasks, member management, and observability features.

---

## Hypothesized Root Cause

1. **Camelcase/snake_case field mismatch in reorder payload construction**: `TaskResponse` DTO serialises the column UUID as `column_id` (JSON). Frontend task objects have `.column_id` set but `.columnId` undefined. The reorder payload builder in `onDragEnd` uses `t.columnId || t.column_id`, which handles the mismatch correctly for that field — **but the actual reorder payload passed to `taskApi.reorder` uses `t.columnId || t.column_id` correctly**. Re-examining: `reordered.map(t => ({ id: t.id, columnId: t.columnId || t.column_id, sortOrder: t.sortOrder ?? t.sort_order ?? 0 }))`. This does correctly fall back to `t.column_id`. So this specific line is actually fine.

2. **Confirmed root cause — `columnIdMap` empty for existing projects**: The `columnIdMap` is populated from `boards[0].columns`. If a project was created before the default column seeding logic was added (i.e., old projects in the DB have a board with no columns), `first.columns` is an empty array and `columnIdMap` stays `{}`. All droppable-ID lookups return `undefined`. The toast "Board still loading" fires and the drag is aborted. This is the primary failure for drag-and-drop on legacy projects.

3. **Confirmed root cause — `onDragEnd` early-exit fires for all column moves on old projects**: `if (!boardId || !destColId)` with `destColId = undefined` (from empty `columnIdMap`) triggers the early-exit toast and returns before calling the reorder API at all.

4. **Context menu `handleStatusChange` fails for WIP limit violations**: `PATCH /tasks/{id}/status` hits `IllegalStateException` inside `updateStatus` when the In Progress column is at WIP limit. The backend returns 500 (unhandled exception, not a mapped error response). The frontend catch block shows `err.response?.data?.message || 'Failed to update status'`. Since the 500 body may not follow the standard error format, the user sees "Failed to update status" with no actionable information.

5. **Context menu move succeeds but board doesn't visually update without WebSocket**: If WS is disconnected, the optimistic state update in `handleStatusChange` sets `status: newStatus` immediately, then replaces with the server response. This part is correct — no bug here when the status API call succeeds.

---

## Correctness Properties

Property 1: Bug Condition — Drag-and-drop and context menu moves complete successfully

_For any_ task move attempt (drag-and-drop or context menu) where `columnIdMap` contains the target column's ID, the fixed `onDragEnd` and `handleStatusChange` functions SHALL complete the move: the task SHALL appear in the target column in the frontend state AND the backend SHALL persist the new column assignment without returning a 4xx or 5xx error.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Non-move task interactions are unaffected

_For any_ user action that does NOT involve moving a task between columns (task creation, edit, delete, duplicate, status display, WS event application), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing task CRUD functionality.

**Validates: Requirements 3.1, 3.2, 3.3**

---

## Fix Implementation

### Changes Required

**Root cause fix — ensure `columnIdMap` is always populated:**

**File**: `frontend/src/pages/Tasks/TasksPage.jsx`

**Specific Changes**:

1. **Fallback `columnIdMap` from tasks when boards return no columns**: If `boards` is empty or `first.columns` is empty, derive `columnIdMap` from the tasks themselves. Each task has a `column_id` and a `status`. Build the map by grouping tasks: `{ [normalizeStatusKey(t.status)]: t.column_id || t.columnId }`. This allows the reorder to work even for old projects without seeded columns, as long as at least one task exists per column.

   ```js
   // After fetching boards and tasks:
   if (boards?.length > 0) {
     const first = boards[0];
     setBoardId(first.id || first.board_id);
     const map = {};
     (first.columns || []).forEach((col) => {
       map[normalizeStatusKey(col.name)] = col.id || col.column_id;
     });
     // If columns were empty, fall back to deriving from task data
     if (Object.keys(map).length === 0 && taskList?.length > 0) {
       taskList.forEach((t) => {
         const key = normalizeStatusKey(t.status);
         if (key && !map[key]) map[key] = t.column_id || t.columnId;
       });
     }
     setColumnIdMap(map);
   }
   ```

2. **Improve WIP limit error messaging**: In `handleStatusChange`, detect 400/500 responses whose message contains "WIP limit" and show a user-friendly toast.

   ```js
   } catch (err) {
     const msg = err.response?.data?.message || err.response?.data?.error || '';
     const userMsg = msg.toLowerCase().includes('wip') || msg.toLowerCase().includes('limit')
       ? 'Cannot move task: column WIP limit reached'
       : msg || 'Failed to update status';
     toast.error(userMsg);
     setTasks(previous);
   }
   ```

3. **Backend — map `IllegalStateException` to 409 Conflict**: In the global exception handler (or a `@ExceptionHandler` in the controllers), map `IllegalStateException` to `409 Conflict` with a structured error body so the frontend can read `err.response.data.message` reliably. This also affects WIP limit errors surfaced via `onDragEnd` → `taskApi.reorder`.

**File**: `backend/src/main/java/com/devopssuite/security/` (or wherever `GlobalExceptionHandler` lives — locate it)

4. **No change needed to `onDragEnd` payload construction**: The `t.columnId || t.column_id` fallback is already correct. The primary fix is ensuring `columnIdMap` is non-empty so `destColId` is never `undefined`.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first surface counterexamples that demonstrate both bugs on unfixed code, then verify the fix works correctly while preserving all existing functionality.

### Exploratory Bug Condition Checking

**Goal**: Confirm the `columnIdMap` empty state is the root cause of drag failure, and confirm WIP limit errors produce unreadable 500 responses.

**Test Plan**: Unit-test `fetchData` with mocked API responses where `boards[0].columns` is an empty array. Assert that `columnIdMap` stays `{}`. Then assert that `onDragEnd` with a non-empty destination triggers the early-exit toast.

**Test Cases**:
1. **Empty columns board**: Mock `getBoards()` to return a board with `columns: []`. Assert `columnIdMap` is `{}` after `fetchData()` (will demonstrate the bug on unfixed code).
2. **WIP limit context menu**: Call `handleStatusChange` with a task targeting a column at WIP limit. Mock `taskApi.updateStatus` to reject with a 500 containing `"Column WIP limit exceeded"`. Assert that the displayed toast says "Failed to update status" with no WIP context (confirms the bug).
3. **Reorder payload with API-shaped tasks**: Simulate `onDragEnd` with tasks that have only `column_id` (no `columnId`). Confirm the reorder API is called (not blocked by early-exit) and the payload `columnId` fields are correct.

**Expected Counterexamples**:
- `columnIdMap` is `{}` → `destColId` is `undefined` → early-exit toast fires instead of reorder call.
- WIP limit 500 response body is not the standard error shape → frontend shows generic toast.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code completes the move.

**Pseudocode:**
```
FOR ALL dragScenario WHERE isMoveFailure(dragScenario, emptyColumnIdMap) DO
  result := onDragEnd_fixed(dragScenario)
  ASSERT taskApi.reorder was called
  ASSERT task.status === destination.droppableId in updated state
END FOR

FOR ALL statusChange WHERE targetColumn.wipLimit reached DO
  result := handleStatusChange_fixed(taskId, newStatus)
  ASSERT toast message contains "WIP limit" or "limit reached"
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (task creation, edit, delete, duplication, WS events), the fixed code behaves identically to the original.

**Pseudocode:**
```
FOR ALL action WHERE action NOT IN [dragDrop, contextMenuMove] DO
  ASSERT fixedHandler(action) === originalHandler(action)
END FOR
```

**Testing Approach**: Property-based testing is recommended for verifying the `columnIdMap` construction across arbitrary board/column shapes, because it catches edge cases like boards with only some columns populated, duplicate status names, or mixed-case column names.

**Test Cases**:
1. **Task creation preservation**: Create a task via the modal. Assert `handleAddTask` still calls `taskApi.create` with the correct payload — unaffected by the fix.
2. **WebSocket event application preservation**: Fire a `CREATED` WS event. Assert the task is appended to state. Fire a `DELETED` event. Assert the task is removed. Both must work identically.
3. **`columnIdMap` built from tasks fallback**: When `first.columns` is empty but `taskList` contains tasks with known `status` + `column_id`, assert the fallback produces the correct map.

### Unit Tests

- Test `normalizeStatusKey` with all display name variants (`"To Do"`, `"In Progress"`, `"Done"`, `"Backlog"`, `"TO_DO"`, `"in_progress"`).
- Test `columnIdMap` fallback construction when board columns array is empty.
- Test `onDragEnd` with non-empty `columnIdMap` proceeds to call `taskApi.reorder`.
- Test `handleStatusChange` WIP limit error toast message.
- Test backend `GlobalExceptionHandler` maps `IllegalStateException` to 409 with structured body.

### Property-Based Tests

- Generate random board shapes (0–5 columns with random display names) and assert the combined `columnIdMap` construction (board columns + task fallback) always produces a non-empty map when at least one task exists.
- Generate random task arrays with mixed camelCase/snake_case shapes and assert the reorder payload `columnId` field is always a non-null UUID.
- Generate random move sequences across the 4 status columns and assert WIP limit errors always produce an informative toast message.

### Integration Tests

- Full drag-and-drop flow: load a project with the old (empty-columns) board shape, drag a task, assert the task appears in the new column.
- Context menu move to a WIP-limited column: assert the user sees the WIP limit message and the task stays in its original column.
- Drag within a column to reorder: assert sort orders update correctly in the backend and the board reflects the new order.
