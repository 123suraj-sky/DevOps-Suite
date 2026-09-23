# Kanban Drag-and-Drop Mobile Teleport Bugfix Design

## Overview

On mobile viewports the Kanban board's drag-and-drop feature is completely broken: when a
user starts dragging a task card the drag clone immediately jumps to the top-left corner of
the screen and cannot be dropped. The root cause is that `Sidebar.jsx` animates its mobile
slide-in/out by applying a CSS `transform` (specifically Tailwind's `translate-x-0` /
`-translate-x-full`) to the `<aside>` element. Any element with a CSS `transform` creates a
new **CSS containing block** for `position: fixed` descendants. `@hello-pangea/dnd` positions
its drag clone with `position: fixed` — when the clone is inside a transformed ancestor its
fixed offset is measured from that ancestor's bounding box instead of the viewport, producing
the top-left teleport.

The fix replaces the `transform`-based slide animation on the `<aside>` with a `left`-offset
transition (`left: -240px` ↔ `left: 0`). This achieves an identical visual slide effect
without writing a CSS `transform` value, so `position: fixed` children continue to be
contained by the viewport. No changes to `TasksPage.jsx` or any DnD consumer are required.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a CSS `transform` value is
  present on the `<aside>` Sidebar element (or any ancestor of the DnD context) at the moment
  a drag begins on a mobile viewport.
- **Property (P)**: The desired correct behavior — the drag clone renders at the cursor
  position and follows the cursor for all viewport sizes.
- **Preservation**: The sidebar's mobile slide animation and desktop static layout must remain
  visually and functionally identical after the fix.
- **`isBugCondition`**: A conceptual predicate that returns `true` when the Sidebar `<aside>`
  has a non-`none` CSS `transform` computed value at drag-start time on a mobile viewport.
- **containing block**: The CSS reference box used to resolve `position: fixed` offsets. It
  defaults to the viewport but is overridden to the nearest ancestor that has `transform`,
  `filter`, `perspective`, or `will-change` set.
- **`@hello-pangea/dnd`**: The react-beautiful-dnd fork used for Kanban drag-and-drop; it
  positions drag clones with `position: fixed` and viewport-relative coordinates.
- **`translate-x-0` / `-translate-x-full`**: Tailwind utilities that compile to
  `transform: translateX(0)` and `transform: translateX(-100%)` respectively, both of which
  set a non-`none` `transform` value that creates a new containing block.
- **`lg:transform-none`**: Tailwind utility that resets `transform: none` at the `lg`
  breakpoint (≥ 1024 px). On mobile this reset is NOT applied, leaving the bug active.

---

## Bug Details

### Bug Condition

The bug manifests when a drag operation begins on a mobile viewport (< 1024 px / `lg`
breakpoint) while the Sidebar's `<aside>` element has `transform: translateX(0)` or
`transform: translateX(-100%)` in its computed style. `@hello-pangea/dnd` calculates the
initial drag-clone position using `getBoundingClientRect()` and applies it as a
`position: fixed` offset, but that offset is measured from the new containing block (the
Sidebar) rather than the viewport, so the clone appears at (0, 0) in Sidebar-space —
which is the top-left of the screen.

**Formal Specification:**
```
FUNCTION isBugCondition(state)
  INPUT: state of type { viewport: Viewport, sidebarComputedTransform: string }
  OUTPUT: boolean

  RETURN state.viewport.width < LG_BREAKPOINT     -- mobile viewport only
         AND state.sidebarComputedTransform != 'none'  -- transform is present
         -- (covers both 'translateX(0)' when open AND 'translateX(-100%)' when closed)
END FUNCTION
```

### Examples

| Scenario | Viewport | Sidebar state | Computed transform | Bug triggers? |
|---|---|---|---|---|
| User opens Kanban on a phone, sidebar closed | 390 px | closed | `translateX(-240px)` | **Yes** — clone teleports |
| User opens Kanban on a phone, sidebar open | 390 px | open | `translateX(0)` | **Yes** — clone teleports |
| User opens Kanban on a tablet in portrait | 768 px | closed | `translateX(-240px)` | **Yes** — below `lg` |
| User opens Kanban on desktop | 1280 px | always visible | `none` (lg:transform-none) | No — works correctly |
| User opens Kanban on desktop-sized browser window | 1024 px | always visible | `none` | No — works correctly |

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The Sidebar MUST slide horizontally into and out of view on mobile with a smooth
  CSS transition, indistinguishable from the current transform-based animation.
- The Sidebar MUST be permanently visible and statically positioned on desktop
  (viewport ≥ `lg`), with no animation or offset applied.
- The mobile backdrop overlay (black/60 semi-transparent overlay behind the open sidebar)
  MUST continue to render and dismiss the sidebar when tapped.
- All existing Kanban drag-and-drop behavior on desktop MUST remain unchanged.
- Right-click context-menu task moves MUST continue to work on all viewports.
- Intra-column reordering and cross-column moves via drag-and-drop MUST continue to work.
- Drag cancellation via Escape MUST continue to restore original task position.

**Scope:**
All inputs that do NOT involve a keyboard number key on the Sidebar component — mouse
interactions, drag events on desktop, touch events unrelated to the sidebar — should be
completely unaffected. Specifically:

- Dragging task cards on desktop (no transform present) is unaffected.
- Clicking sidebar nav links on mobile is unaffected.
- Modal open/close behavior is unaffected.

---

## Hypothesized Root Cause

Based on the bug description and CSS specification, there is one primary root cause with
no ambiguity:

1. **CSS Containing Block Violation**: Tailwind's `translate-x-0` and `-translate-x-full`
   classes compile to `transform: translateX(0)` and `transform: translateX(-100%)`.
   Per the CSS Transforms specification, any element with a `transform` value other than
   `none` establishes a new containing block for all `position: fixed` descendants.
   `@hello-pangea/dnd` applies `position: fixed` to its drag clone overlay. When the clone
   is rendered inside a transformed ancestor, its top/left offsets are relative to that
   ancestor rather than the viewport, placing it at the ancestor's origin — the top-left
   of the screen.

2. **`lg:transform-none` Does Not Apply on Mobile**: The `lg:transform-none` class on the
   `<aside>` correctly removes `transform` on ≥1024 px viewports. However, on mobile
   viewports below `lg` both the open (`translate-x-0`) and closed (`-translate-x-full`)
   states result in a non-`none` transform, meaning the bug is active regardless of whether
   the sidebar is open or closed when the drag begins.

3. **No DnD-Side Workaround Is Correct Here**: `@hello-pangea/dnd` does not expose a
   mechanism to override containing-block resolution. Portal-based rendering of the drag
   clone could theoretically work but is not the supported pattern and would require
   significant invasive changes. The correct fix is to remove the containing-block violation
   at its source.

---

## Correctness Properties

Property 1: Bug Condition — Drag Clone Viewport Positioning

_For any_ drag interaction where `isBugCondition` holds (mobile viewport, Sidebar element
has a non-`none` CSS `transform`), the **fixed** Sidebar MUST NOT have a CSS `transform`
value, so that `@hello-pangea/dnd`'s `position: fixed` drag clone is correctly contained by
the viewport and the drag clone SHALL appear at the cursor position and follow the cursor
throughout the drag on all viewport sizes.

**Validates: Requirements 2.1, 2.2, 2.4**

Property 2: Preservation — Sidebar Animation and Layout Unchanged

_For any_ interaction where `isBugCondition` does NOT hold (no drag in progress, or desktop
viewport), the fixed Sidebar's slide-in/out animation on mobile and its static layout on
desktop SHALL be visually and functionally identical to the original implementation,
preserving all navigation, backdrop, and toggle behaviors.

**Validates: Requirements 3.1, 3.2, 3.7**

---

## Fix Implementation

### Changes Required

**File**: `frontend/src/components/layout/Sidebar.jsx`

**Element**: `<aside>` element's `className`

The fix replaces `transform` + `translate-x-{value}` with `left` offset transitions.
The sidebar is `position: fixed` on mobile (which it already is via `fixed ... inset-y-0
left-0`). We use `left: 0` for open and `left: -240px` (the sidebar width, `w-60` = 240 px)
for closed, with a CSS transition on the `left` property.

**Specific Changes:**

1. **Remove `transform` from the transition list**: Change
   `transition-[transform,background-color,border-color]` to
   `transition-[left,background-color,border-color]`. This transitions the `left` property
   instead of `transform`.

2. **Remove the `transform` base class**: Remove the standalone `'transform'` class from the
   `<aside>` className. This class compiles to `transform: translateX(0)` (Tailwind's
   hardware-acceleration hint) and is the primary source of the containing-block violation.

3. **Replace translate classes with left-offset classes**: Replace the conditional
   `isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'`
   with
   `isOpen ? 'left-0' : '-left-60 lg:left-0'`.
   - `left-0` = `left: 0` — sidebar in view.
   - `-left-60` = `left: -240px` — sidebar fully off-screen to the left (matches `w-60`).
   - `lg:left-0` — on desktop the `left` offset is always 0 (sidebar uses `static`
     positioning via `lg:static` anyway, so `left` has no effect, but the reset is
     explicit for clarity).

4. **Verify `lg:static` is present**: The `<aside>` already has `fixed lg:static` in its
   className, which ensures that on desktop `position: static` is applied and `left`
   transitions have no effect. No change needed here.

5. **No changes to `duration-200`**: The 200 ms duration applies to all transitioned
   properties and remains correct.

**Resulting `<aside>` className (relevant classes):**
```
'fixed lg:static inset-y-0 left-0 z-30',
'w-60 flex flex-col shrink-0',
'bg-[var(--surface-raised)] border-r border-[var(--border-subtle)]',
'transition-[left,background-color,border-color] duration-200 lg:transform-none',
isOpen ? 'left-0' : '-left-60 lg:left-0'
```

Note: `lg:transform-none` is retained as a safe reset for any theme or browser that may
still report a computed `transform`. It is harmless on desktop.

---

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach: first, surface counterexamples demonstrating the bug
on the unfixed code (explore and confirm root cause), then verify the fix eliminates the bug
while leaving all sidebar and DnD behaviors intact.

---

### Exploratory Bug Condition Checking

**Goal**: Confirm the root cause by inspecting the `<aside>` element's computed style and
verifying that `@hello-pangea/dnd` produces incorrect clone positions when a CSS `transform`
is present. Run these checks on the **unfixed** code.

**Test Plan**: Use browser DevTools or unit tests to assert that the Sidebar's `<aside>`
element has `transform: translateX(0)` / `translateX(-240px)` in its computed style on
mobile viewports, and that this value is non-`none`. Simulate a drag event and observe that
the drag clone offset is wrong.

**Test Cases:**

1. **Closed Sidebar Transform Test**: On a mobile viewport (< 1024 px) with sidebar closed,
   assert `getComputedStyle(aside).transform !== 'none'`. (Will pass on unfixed code,
   confirming the root cause.)

2. **Open Sidebar Transform Test**: On a mobile viewport with sidebar open, assert
   `getComputedStyle(aside).transform !== 'none'`. (Will pass on unfixed code.)

3. **Desktop No-Transform Test**: On a desktop viewport (≥ 1024 px), assert
   `getComputedStyle(aside).transform === 'none'`. (Should already pass on unfixed code —
   explains why the bug only affects mobile.)

4. **Drag Clone Position Test (unfixed)**: Simulate a `dragStart` event on a task card on
   mobile and read the drag clone's `style.top` / `style.left`. Assert they are NOT equal
   to the card's `getBoundingClientRect()` offsets. (Will demonstrate the top-left jump.)

**Expected Counterexamples:**
- `getComputedStyle(aside).transform` returns `matrix(1, 0, 0, 1, 0, 0)` (translateX(0))
  or `matrix(1, 0, 0, 1, -240, 0)` (translateX(-240px)) — confirms containing-block
  violation is present.

---

### Fix Checking

**Goal**: Verify that after the fix, `isBugCondition` never holds — the `<aside>` element
has no CSS `transform` on any viewport, so drag clones are always viewport-relative.

**Pseudocode:**
```
FOR ALL viewport IN [mobile-sm, mobile-md, tablet, desktop] DO
  FOR ALL sidebarState IN [open, closed] DO
    input := { viewport, sidebarState }
    IF isBugCondition(input) THEN
      result := computedStyle(aside).transform
      ASSERT result == 'none'
    END IF
  END FOR
END FOR
```

**Test Cases:**

1. **Fixed — Mobile Closed**: On mobile viewport with sidebar closed, assert
   `getComputedStyle(aside).transform === 'none'`.

2. **Fixed — Mobile Open**: On mobile viewport with sidebar open, assert
   `getComputedStyle(aside).transform === 'none'`.

3. **Fixed — Drag Clone Position**: Simulate `dragStart` on mobile and assert drag clone
   `style.top` / `style.left` match the card's `getBoundingClientRect()` offsets.

4. **Fixed — Drag Follows Cursor**: Simulate pointer move events after drag start and assert
   drag clone position updates correctly.

---

### Preservation Checking

**Goal**: Verify that the sidebar's visual and functional behavior is unchanged for all
non-drag interactions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT sidebar_fixed(input) produces same visual result as sidebar_original(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking
because the space of viewport sizes and interaction sequences is large. Snapshot testing
can also capture visual regression for the sidebar animation.

**Test Cases:**

1. **Slide Animation Preservation**: On mobile, toggle the sidebar open and closed. Assert
   that the sidebar transitions from off-screen to on-screen (left: -240px → left: 0) with
   the same 200 ms duration. Observe visually or via animation timing assertions.

2. **Desktop Static Layout Preservation**: On desktop viewport, assert the sidebar is
   visible with no `left` offset and `position: static`.

3. **Backdrop Preservation**: On mobile, open the sidebar and tap the backdrop. Assert
   the sidebar closes (returns to `left: -240px`).

4. **Nav Link Preservation**: On mobile, open the sidebar and click a nav link. Assert
   the sidebar closes and the route changes correctly.

5. **Desktop Drag Unaffected**: On desktop, drag a task card and assert it continues to
   work correctly (regression check that desktop behavior is unchanged).

---

### Unit Tests

- Assert `<aside>` does not receive any `translate-x-*` Tailwind class after the fix.
- Assert `<aside>` receives `-left-60` when `isOpen=false` and `left-0` when `isOpen=true`.
- Assert `transition-[left,...]` is present in the className (not `transition-[transform,...]`).
- Assert `getComputedStyle(aside).transform === 'none'` on mobile viewport (both sidebar states).

### Property-Based Tests

- Generate random sequences of `open`/`close` sidebar toggles and assert that after each
  transition the `<aside>` computed `transform` remains `none` on mobile viewports.
- Generate random viewport widths in `[320, 1023]` (mobile range) and assert the sidebar's
  `left` offset is either `0` (open) or `-240px` (closed), never a `transform` value.
- Generate random viewport widths in `[1024, 2560]` (desktop range) and assert the sidebar
  is `position: static` with no `transform` and no `left` offset applied.

### Integration Tests

- **Full Drag Flow on Mobile**: Open the app on a mobile viewport, open the Kanban board,
  start a drag, assert the clone follows the cursor, complete the drop into a different
  column, assert the task's column is updated.
- **Sidebar Toggle + Drag**: On mobile, open the sidebar, close it, start a drag on a
  task card — assert the drag clone position is correct (sidebar close didn't leave a
  stale transform).
- **Desktop Drag Unchanged**: On desktop, drag a task card across columns — assert existing
  behavior is fully preserved.
- **Mobile Navigation**: Toggle the sidebar open and closed multiple times, navigate via
  nav links — assert the sidebar opens and closes with smooth animation on each toggle.
