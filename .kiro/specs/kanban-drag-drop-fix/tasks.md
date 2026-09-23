# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Sidebar Transform Breaks DnD Clone Positioning
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples demonstrating that `<aside>` has a non-`none` computed `transform` on mobile viewports, which causes `@hello-pangea/dnd` to mis-position its `position: fixed` drag clone
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases — viewport widths in `[320, 1023]`, both `isOpen=true` and `isOpen=false` sidebar states — since the bug is deterministic within that range
  - Render `<Sidebar>` in a jsdom environment with a mocked viewport width < 1024 px
  - For both `isOpen={true}` and `isOpen={false}`, call `getComputedStyle(aside).transform`
  - Assert that `getComputedStyle(aside).transform === 'none'` (this will FAIL on unfixed code, proving the bug)
  - **Expected counterexample on unfixed code**: `transform` returns `matrix(1, 0, 0, 1, 0, 0)` (translateX(0)) for open state, or `matrix(1, 0, 0, 1, -240, 0)` (translateX(-240px)) for closed state — both confirm the containing-block violation
  - Document the counterexample: e.g., `"isOpen=false, viewport=390px → transform: matrix(1,0,0,1,-240,0) — DnD clone will be viewport-offset from Sidebar origin instead of screen origin"`
  - Run test on **UNFIXED** code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Mark task complete when test is written, run, and the failure + counterexample are documented
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Sidebar Slide Animation and Desktop Layout Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run these on **UNFIXED** code first, record actual outputs, then encode them as assertions
  - Observe on unfixed code:
    - `isOpen=true` → `<aside>` has class `translate-x-0`, computed left offset is 0, sidebar is visible
    - `isOpen=false` → `<aside>` has class `-translate-x-full`, sidebar is off-screen to the left
    - Desktop viewport (≥ 1024 px) → `<aside>` has `lg:transform-none`, `position: static`, always visible
    - `transition-[transform,background-color,border-color] duration-200` present in className
    - Backdrop renders and triggers `onClose` when clicked (mobile, `isOpen=true`)
  - Write property-based tests that generate random viewport widths in `[320, 1023]` (mobile) and `[1024, 2560]` (desktop) and assert:
    - **Mobile open**: sidebar is visible (left offset = 0, or translated to 0)
    - **Mobile closed**: sidebar is off-screen (left = -240 px or equivalent)
    - **Desktop any state**: `position: static`, sidebar always rendered in flow
  - Write unit-level assertion: `transition-*` class on `<aside>` always includes `background-color` and `border-color` (shared part that must be preserved)
  - Write unit-level assertion: backdrop `<div>` renders when `isOpen=true` on mobile and calls `onClose` on click
  - Run all preservation tests on **UNFIXED** code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve after the fix)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.7_

- [x] 3. Fix: remove transform-based slide animation from Sidebar `<aside>`

  - [x] 3.1 Apply the className change in `frontend/src/components/layout/Sidebar.jsx`
    - Open the `<aside>` element's `cn(...)` call
    - Remove the standalone `'transform'` class (Tailwind hardware-acceleration hint that compiles to `transform: translateX(0)` and is the primary source of the containing-block violation)
    - Change `transition-[transform,background-color,border-color]` → `transition-[left,background-color,border-color]` so the `left` property is transitioned instead
    - Replace the conditional `isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'` with `isOpen ? 'left-0' : '-left-60 lg:left-0'`
      - `left-0` = `left: 0` — sidebar in view
      - `-left-60` = `left: -240px` — sidebar fully off-screen (matches `w-60` = 240 px)
      - `lg:left-0` — explicit reset on desktop (harmless since `lg:static` means `left` has no layout effect)
    - Retain `lg:transform-none` as a safe reset for any browser that may still report a computed `transform`
    - No other files require changes
    - _Bug_Condition: isBugCondition(state) where state.viewport.width < 1024 AND state.sidebarComputedTransform !== 'none'_
    - _Expected_Behavior: getComputedStyle(aside).transform === 'none' for all viewport widths and sidebar states after the fix_
    - _Preservation: Sidebar slide animation (open ↔ closed) on mobile and static desktop layout must be visually identical; all nav, backdrop, and toggle behaviors unchanged_
    - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.2, 3.7_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Sidebar Transform Breaks DnD Clone Positioning
    - **IMPORTANT**: Re-run the SAME test written in task 1 — do NOT write a new test
    - The test from task 1 asserts `getComputedStyle(aside).transform === 'none'` on mobile viewports for both sidebar states
    - Run it against the **fixed** code
    - **EXPECTED OUTCOME**: Test PASSES — confirms the containing-block violation is eliminated and `@hello-pangea/dnd` drag clones will now be viewport-relative
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Sidebar Slide Animation and Desktop Layout Unchanged
    - **IMPORTANT**: Re-run the SAME tests written in task 2 — do NOT write new tests
    - Run all preservation tests against the **fixed** code
    - **EXPECTED OUTCOME**: Tests PASS — confirms no visual or functional regression in sidebar behavior, animation, backdrop, or desktop layout
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Verify fix in browser (manual validation)
  - Open the app in a browser and navigate to a project's Kanban board
  - Open DevTools → Toggle device toolbar → Select a mobile preset (e.g., iPhone SE, 375 × 667)
  - Drag a task card from one column to another: confirm the drag clone appears at the card's position and follows the finger/pointer correctly — no teleport to top-left
  - Toggle the sidebar open and closed: confirm it still slides in/out smoothly with the same visual appearance
  - Tap the backdrop: confirm it dismisses the sidebar
  - Switch DevTools to a desktop viewport (≥ 1024 px): drag a task card and confirm desktop DnD is unchanged
  - Optionally inspect the `<aside>` element in DevTools Computed panel: confirm no `transform` value other than `none` is present on mobile

- [~] 5. Checkpoint — Ensure all tests pass
  - Run the full frontend test suite: `cd frontend && npm test -- --run` (or equivalent)
  - Confirm task 1 (Property 1: Bug Condition) passes
  - Confirm task 2 (Property 2: Preservation) passes
  - Confirm no other tests are broken
  - Ask the user if any questions arise before closing the spec
