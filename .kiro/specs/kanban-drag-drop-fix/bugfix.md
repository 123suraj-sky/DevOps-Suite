# Bugfix Requirements Document

## Introduction

When a user drags a task card on the Kanban board (`/projects/:id/tasks`), the drag clone
immediately teleports to the top-left corner of the screen and does not follow the cursor.
The card cannot be dropped into any column, making the entire drag-and-drop feature
non-functional. The right-click "Move to another section" context menu is unaffected.

The root cause is a CSS `transform` property on an ancestor element. `@hello-pangea/dnd`
(the react-beautiful-dnd fork in use) positions its drag clone with `position: fixed`,
which is supposed to be offset relative to the viewport. However, any ancestor element that
has a CSS `transform` (including `translate`) applied creates a new containing block for
fixed-positioned descendants — the clone is then offset relative to that transformed
ancestor rather than the viewport, producing the top-left jump.

The `<Sidebar>` component (`Sidebar.jsx`) applies `transform` on mobile to slide in/out:
`transform transition-[transform,...] duration-200 lg:transform-none` with
`translate-x-0` / `-translate-x-full`. Although the sidebar uses `lg:transform-none` on
desktop, the `transform` CSS property is still present in the browser's computed style on
mobile viewports, breaking `position: fixed` for all drag clones within `MainLayout`.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user begins dragging a task card on the Kanban board on mobile (viewport < lg breakpoint) THEN the drag clone immediately jumps to the top-left corner of the screen instead of rendering under the cursor.

1.2 WHEN a user begins dragging a task card on the Kanban board on mobile THEN the drag clone does not follow the cursor as the user moves it.

1.3 WHEN a user begins dragging a task card on the Kanban board on mobile THEN the drag cannot be completed by dropping into any column, leaving the board in an unusable drag state.

1.4 WHEN the Sidebar is in its closed state (`-translate-x-full`) on mobile THEN the CSS `transform` is still applied to the `<aside>` element, causing `@hello-pangea/dnd`'s `position: fixed` drag clone to be contained by the Sidebar's coordinate space rather than the viewport.

### Expected Behavior (Correct)

2.1 WHEN a user begins dragging a task card on the Kanban board on any viewport size THEN the drag clone SHALL appear directly under the cursor at the correct position and remain attached to the cursor throughout the drag.

2.2 WHEN a user drags a task card on the Kanban board on mobile THEN the drag clone SHALL follow the cursor smoothly without jumping or teleporting.

2.3 WHEN a user drops a task card onto a valid column droppable THEN the system SHALL register the drop and update the task's column and sort order correctly.

2.4 WHEN the Sidebar slide-in/out animation runs on mobile THEN the animation SHALL NOT use a CSS `transform` property on any ancestor of the Kanban board's `DragDropContext`, so that `@hello-pangea/dnd`'s fixed-position drag clone is correctly contained by the viewport.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user views the app on mobile (viewport < lg) THEN the Sidebar SHALL CONTINUE TO slide in and out smoothly when toggled, preserving its open/closed visual behavior.

3.2 WHEN a user views the app on desktop (viewport ≥ lg) THEN the Sidebar SHALL CONTINUE TO be permanently visible and statically positioned without any animation.

3.3 WHEN a user right-clicks a task card and selects "Move to another section" THEN the system SHALL CONTINUE TO move the task to the selected column without errors.

3.4 WHEN a user drags and drops a task card within the same column THEN the system SHALL CONTINUE TO reorder tasks by updating `sortOrder` and persisting the change via the reorder API.

3.5 WHEN a user drags and drops a task card to a different column THEN the system SHALL CONTINUE TO update the task's `status` and `columnId` and persist the change via the reorder API.

3.6 WHEN a drag is cancelled (e.g., by pressing Escape) THEN the system SHALL CONTINUE TO restore the task to its original position without any state mutation.

3.7 WHEN a user opens or dismisses a Modal (Add Task, Edit Task) on the Kanban board THEN the Sidebar animation SHALL CONTINUE TO be unaffected.
