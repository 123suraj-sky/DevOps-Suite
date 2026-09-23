# Bugfix Requirements Document

## Introduction

Tasks in the Kanban board (`TasksPage.jsx`) cannot be moved between columns. Both supported methods — drag-and-drop via `react-beautiful-dnd` and the right-click context menu "Move to" action — produce no visible state change and do not persist to the backend.

The root cause is a **`columnIdMap` population failure**. On page load, `getBoards()` fetches the board and maps each column's display name (e.g., `"To Do"`) to its database column ID. However, the `normalizeStatusKey()` utility converts those names to uppercase underscore form (`"TO_DO"`), while the canonical status keys used throughout the board are `"TODO"` (no underscore). The `normalizeStatusKey` function does handle the `TO_DO → TODO` conversion in isolation, but only one of the two call sites applies it consistently — causing `columnIdMap` to contain unmapped or incorrectly keyed entries. As a result, `columnIdMap[destination.droppableId]` returns `undefined` in `onDragEnd`, and `handleStatusChange` silently sends `undefined` as the column ID in the reorder payload, so neither drag-and-drop nor context-menu moves ever reach the backend correctly.

This fix must address both failure modes without disrupting any working Kanban functionality (task creation, editing, deletion, duplication, and assignment).

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user drags a task card from one column to a different column THEN the system reverts the card to its original column without persisting any state change to the backend

1.2 WHEN a user opens the right-click context menu on a task card and selects a "Move to" target column THEN the system does not update the task's status and the card remains in its original column

1.3 WHEN `columnIdMap` is populated from the board's column data THEN the system produces a map that does not correctly index column IDs under the status keys (`BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`) used by the drag-and-drop droppable IDs and `handleStatusChange`

1.4 WHEN `onDragEnd` looks up `columnIdMap[destination.droppableId]` for a valid destination column THEN the system receives `undefined`, causing the early-exit guard `if (!boardId || !destColId)` to trigger and abort the move with an error toast ("Board still loading — please try again.")

1.5 WHEN `handleStatusChange` calls `taskApi.updateStatus(taskId, newStatus)` after a context-menu move THEN the system may send `undefined` as the `columnId` in the reorder payload, causing the backend to reject or silently ignore the operation

### Expected Behavior (Correct)

2.1 WHEN a user drags a task card from one column to a different column THEN the system SHALL optimistically update the UI to reflect the new position, call `taskApi.reorder()` with valid column IDs, and persist the move to the backend

2.2 WHEN a user opens the right-click context menu on a task card and selects a "Move to" target column THEN the system SHALL update the task's status optimistically in the UI, call `taskApi.updateStatus()` with the new status, and persist the change to the backend

2.3 WHEN `columnIdMap` is populated from the board's column data THEN the system SHALL correctly map each column's status key (`BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`) to its corresponding database column ID, regardless of the raw name casing or spacing returned by the backend

2.4 WHEN `onDragEnd` looks up `columnIdMap[destination.droppableId]` for a valid destination column THEN the system SHALL resolve a non-`undefined` column ID and proceed with the reorder API call

2.5 WHEN `handleStatusChange` resolves the destination column ID from `columnIdMap` THEN the system SHALL pass a valid column ID to `taskApi.updateStatus()` so the backend can persist the status change

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user creates a new task in any column THEN the system SHALL CONTINUE TO resolve the correct `columnId` from `columnIdMap` and successfully persist the task to the backend

3.2 WHEN a user edits a task and changes its status via the edit modal THEN the system SHALL CONTINUE TO update the task's column and status on the backend without error

3.3 WHEN a user deletes or duplicates a task THEN the system SHALL CONTINUE TO perform those operations unaffected by changes to `columnIdMap` population logic

3.4 WHEN a user drags a task card within the same column to reorder it THEN the system SHALL CONTINUE TO reorder tasks within that column and persist the new sort order

3.5 WHEN a WebSocket `STATUS_CHANGED` or `MOVED` event arrives for a task THEN the system SHALL CONTINUE TO update the local task list in the UI without triggering a full re-fetch

3.6 WHEN the board data has not yet loaded (e.g., `boardId` is null) THEN the system SHALL CONTINUE TO show the "Board still loading" error toast and abort the move rather than making a malformed API call
