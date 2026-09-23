# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Empty columnIdMap causes move failure on legacy projects
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples demonstrating that `columnIdMap` is `{}` when `boards[0].columns` is empty, and that this causes drag-and-drop to fire the early-exit toast instead of calling `taskApi.reorder`
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — a board returned from `getBoards()` with `columns: []` and a task list containing tasks with `status` + `column_id` fields
  - Test that when `fetchData` resolves with `boards[0].columns = []` and a non-empty `taskList`, `columnIdMap` remains `{}` (unfixed behavior)
  - Then simulate `onDragEnd` with a valid destination droppableId (`"IN_PROGRESS"`) and assert `taskApi.reorder` is NOT called (because `destColId` is `undefined` and the early-exit fires)
  - Also test that `handleStatusChange` catch block with a 500 response containing `"Column WIP limit exceeded"` produces a toast of `"Failed to update status"` (no WIP context — the unfixed behavior)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - `columnIdMap` is `{}` → `destColId` is `undefined` → early-exit toast fires instead of reorder call
    - WIP limit 500 body message is swallowed → user sees generic toast
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-move task interactions are unaffected by `columnIdMap` changes
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-move actions:
    - `handleAddTask` calls `taskApi.create` with `columnId = columnIdMap[selectedColumn]` — succeeds when `columnIdMap` is correctly populated for new projects
    - `handleDeleteTask` calls `taskApi.delete(taskId)` — no dependency on `columnIdMap`
    - `handleDuplicate` calls `taskApi.duplicate(task.id)` — no dependency on `columnIdMap`
    - WebSocket `CREATED` event appends task to state; `DELETED` removes it; `UPDATED`/`STATUS_CHANGED` replaces it
    - When `boardId` is `null`, `onDragEnd` still fires the "Board still loading" toast (3.6 guard)
  - Write property-based tests:
    - For all `action` in `[create, delete, duplicate, wsCreate, wsDelete, wsUpdate]`: assert the handler produces the same output on unfixed code as it does with no `columnIdMap` changes applied
    - Generate random board shapes (0–5 columns, random display names) and assert `normalizeStatusKey` always returns one of `BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE` for valid inputs
    - For `boardId = null` on `onDragEnd`: assert the early-exit toast fires and `taskApi.reorder` is never called
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for Kanban task move broken on legacy projects + WIP limit error messaging

  - [x] 3.1 Add `columnIdMap` fallback from task list in `fetchData` (`TasksPage.jsx`)
    - In `fetchData`, after building `map` from `(first.columns || [])`, add a fallback block:
      ```js
      if (Object.keys(map).length === 0 && taskList?.length > 0) {
        taskList.forEach((t) => {
          const key = normalizeStatusKey(t.status);
          if (key && !map[key]) map[key] = t.column_id || t.columnId;
        });
      }
      ```
    - This ensures that projects with an old board (no seeded columns) can still resolve column IDs from the tasks already stored against those columns
    - Place the block immediately after the `forEach` that iterates `first.columns`, before `setColumnIdMap(map)`
    - _Bug_Condition: `isBugCondition` = `boards[0].columns` is empty (`[]`) AND project has existing tasks with `column_id` set_
    - _Expected_Behavior: `columnIdMap` maps `BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE` to non-`undefined` UUIDs derived from task data; `onDragEnd` proceeds past the `!destColId` guard and calls `taskApi.reorder`_
    - _Preservation: fallback block is only entered when `map` is empty — all projects with a properly seeded board (non-empty `columns`) continue using the board column IDs exactly as before_
    - _Requirements: 2.3, 2.4, 3.1, 3.4_

  - [x] 3.2 Improve WIP limit error message in `handleStatusChange` catch block (`TasksPage.jsx`)
    - Replace the current catch body:
      ```js
      // Before
      toast.error(err.response?.data?.message || 'Failed to update status');
      ```
      With:
      ```js
      // After
      const rawMsg = err.response?.data?.error?.message
        || err.response?.data?.message
        || err.response?.data?.error
        || '';
      const userMsg =
        rawMsg.toLowerCase().includes('wip') || rawMsg.toLowerCase().includes('limit')
          ? 'Cannot move task: column WIP limit reached'
          : rawMsg || 'Failed to update status';
      toast.error(userMsg);
      ```
    - The extra `err.response?.data?.error?.message` path handles the `ProjectExceptionHandler` `ErrorResponse` shape (`{ error: { code, message, ... } }`)
    - _Bug_Condition: `isBugCondition` = backend returns a 409 (or 500) with a message containing "WIP" or "limit" and the frontend catch block shows a generic toast_
    - _Expected_Behavior: user sees "Cannot move task: column WIP limit reached" and the task stays in its original column (rollback is already handled by the existing `setTasks(previous)` call)_
    - _Preservation: all non-WIP errors (404, 403, network errors) still show the original message or "Failed to update status" fallback — behavior unchanged_
    - _Requirements: 2.2, 2.5_

  - [x] 3.3 Verify `IllegalStateException` → 409 handler already exists in `ProjectExceptionHandler` (backend)
    - Open `backend/src/main/java/com/devopssuite/project/controller/ProjectExceptionHandler.java`
    - Confirm the `@ExceptionHandler(IllegalStateException.class)` method returning `HttpStatus.CONFLICT` with code `"CONFLICT"` is present — it already exists as of the current codebase
    - If it is present: no code change needed; document confirmation in task notes
    - If it is absent (regression): add the handler following the same pattern as the existing `badRequest` handler, returning `HttpStatus.CONFLICT` (409) with error code `"CONFLICT"` and the exception message as the body
    - _Bug_Condition: without this handler, WIP limit violations surface as unhandled 500 responses; the frontend `err.response?.data?.message` path returns `undefined` and the generic toast fires_
    - _Expected_Behavior: WIP limit violation returns `{ error: { code: "CONFLICT", message: "Column WIP limit exceeded", ... }, status: 409 }` — the frontend catch block can read `err.response?.data?.error?.message` reliably_
    - _Preservation: all other exception mappings (`ResourceNotFoundException` → 404, `ForbiddenException` → 403, `MethodArgumentNotValidException` → 400) remain unchanged_
    - _Requirements: 2.2_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Empty columnIdMap fallback populates from tasks; WIP toast is informative
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior:
      - `columnIdMap` is non-empty when board columns are empty but tasks exist → `destColId` resolves → `taskApi.reorder` is called
      - WIP limit catch block produces "Cannot move task: column WIP limit reached"
    - Run bug condition exploration test from step 1 against the fixed code
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-move task interactions are unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2 against the fixed code
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — End-to-end validation and all tests pass
  - Manually verify end-to-end on a legacy project (board with empty `columns` array):
    - Drag a task from `TODO` to `IN_PROGRESS` — assert task moves and persists
    - Drag a task within the same column to reorder — assert sort order persists
    - Right-click a task and select "Move to Done" — assert task moves and persists
    - Right-click a task and move to `IN_PROGRESS` when it is at WIP limit — assert toast reads "Cannot move task: column WIP limit reached" and task stays put
  - Manually verify on a new project (board with 4 seeded columns) that all the same flows work and the board column IDs are used (not the fallback)
  - Run the full test suite and ensure all tests pass; ask the user if questions arise
