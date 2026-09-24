# 07 — Task Modal Inputs Lose Focus After Every Keystroke

## Symptoms

- Opening the **Add Task** or **Edit Task** modal and typing in the **Title** or **Description** field causes focus to drop after exactly one character.
- The user must click the input again to re-focus, then type one more character, then click again — making the fields effectively unusable for keyboard input.
- The **Select dropdowns** (Status, Priority, Assignee) and the **Due Date** input were not affected.
- The bug was introduced when the custom `Select` component was added; prior to that, `TaskFormFields` already existed inside `TasksPage` but state updates were less frequent.

---

## Root Cause

`TaskFormFields` was declared as a **`const` inside the `TasksPage` component function body**:

```jsx
// ❌ WRONG — inside TasksPage
export const TasksPage = () => {
  // ...state...

  const TaskFormFields = ({ data, setData, showStatus = false }) => (
    <div className="space-y-4">
      <Input label="Title" value={data.title} onChange={...} />
      {/* ... */}
    </div>
  );

  return (
    <Modal ...>
      <TaskFormFields data={taskData} setData={setTaskData} />
    </Modal>
  );
};
```

Every time `setData` was called (i.e. on every `onChange` fired by the `Input` — once per keystroke), `TasksPage` re-rendered. During that re-render, JavaScript executed the function body again and created a **brand-new function object** for `TaskFormFields`. React identifies component types by **referential identity** (`===`). When it diffed the old tree against the new tree, it saw a different component type at the same position, so it:

1. Unmounted the entire old `TaskFormFields` subtree (destroying the focused `<input>`).
2. Mounted a fresh `TaskFormFields` subtree (creating a new `<input>` with no focus).

The result was that every single keystroke triggered a full unmount + remount cycle on the form, causing the input to lose focus after each character.

### Why only Title and Description were affected

The `Select` dropdowns and `Input[type="date"]` were also children of `TaskFormFields`, but they do not exhibit focus loss visibly because:
- Dropdowns close on selection and don't require sustained focus.
- The date picker is OS-controlled and does not rely on React-managed focus the same way.

Only text inputs, where the user expects to type multiple characters in sequence, make the bug immediately apparent.

---

## Fix

Move `TaskFormFields` (and its supporting constant maps `PRIORITY_INDICATOR` and `STATUS_INDICATOR`) to **module scope** — outside the `TasksPage` function entirely. A module-level `const` is created once when the module is first imported and its reference never changes across re-renders.

The only runtime value `TaskFormFields` needed from the parent was `assignableMembers` (the project's member list for the Assignee dropdown). This was passed as an explicit `members` prop instead of closing over it from the parent scope.

```jsx
// ✅ CORRECT — at module scope, outside TasksPage

const PRIORITY_INDICATOR = {
  LOW:    'bg-[var(--status-neutral)]',
  MEDIUM: 'bg-amber-400',
  HIGH:   'bg-[var(--status-danger)]',
};

const STATUS_INDICATOR = {
  BACKLOG:     'bg-[var(--status-neutral)]',
  TODO:        'bg-[var(--status-neutral)]',
  IN_PROGRESS: 'bg-amber-400',
  DONE:        'bg-[var(--status-success)]',
};

const TaskFormFields = ({ data, setData, showStatus = false, members = [] }) => (
  <div className="space-y-4">
    <Input label="Title" value={data.title} onChange={...} required />
    {/* ... */}
    <Select label="Assignee" value={data.assigneeId} onChange={...}>
      <option value="">Unassigned</option>
      {members.map((m) => <option key={m.userId} value={m.userId}>...</option>)}
    </Select>
  </div>
);

export const TasksPage = () => {
  const assignableMembers = project?.members || [];

  return (
    <Modal ...>
      <TaskFormFields data={taskData} setData={setTaskData} members={assignableMembers} />
    </Modal>
  );
};
```

With this change, React sees the same `TaskFormFields` reference on every render, diffs the props, and updates only what changed — without any unmount/remount cycle. Focus is preserved across all keystrokes.

---

## General Rule

**Never define a React component inside another component's render function or body**, unless it is intentionally recreated on every render (which is almost never what you want). This includes:

- `const MyComponent = () => (...)` inside a parent component
- `function MyComponent() {...}` inside a parent component
- Components returned from hooks or render props that are re-created each time

If a component needs data from the parent, pass it as **props**. If it needs to close over state from a parent hook (e.g. a setter), pass the setter as a prop too.

The symptom is always the same: the child subtree unmounts and remounts on every parent render, losing all internal state (including focus, scroll position, and any uncontrolled input values).

---

## Affected Files

| File | Change |
|---|---|
| `frontend/src/pages/Tasks/TasksPage.jsx` | Moved `TaskFormFields`, `PRIORITY_INDICATOR`, `STATUS_INDICATOR` to module scope; added `members` prop |

## Commit

`0d9592a` — `fix(tasks): move TaskFormFields to module scope to fix focus loss on typing`
