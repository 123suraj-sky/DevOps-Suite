/**
 * Bug Condition Exploration Test — Sidebar Transform Breaks DnD Clone Positioning
 *
 * Property 1: Bug Condition
 *   MUST FAIL on unfixed code — failure confirms the bug exists.
 *
 * Root cause:
 *   Tailwind's `transform` base class (applied to <aside>) compiles to
 *   `transform: translateX(0)`, and `translate-x-0` / `-translate-x-full` also
 *   set CSS `transform`. Any element with a non-`none` CSS transform creates a
 *   new containing block for `position: fixed` descendants. @hello-pangea/dnd
 *   positions its drag clone with `position: fixed`, so on mobile viewports the
 *   clone is offset from the Sidebar origin instead of the viewport — it teleports
 *   to the top-left of the screen.
 *
 * Methodology:
 *   jsdom does not process Tailwind CSS, so `getComputedStyle` won't reflect
 *   Tailwind utility values. Instead we assert directly on the rendered className:
 *   - Unfixed code:  <aside> carries `transform` base class AND `translate-x-0`
 *     or `-translate-x-full` — both classes that compile to a non-`none` CSS
 *     transform on mobile. These trigger the containing-block violation.
 *   - Fixed code:    <aside> carries neither `transform` nor any `translate-x-*`
 *     class; instead it uses `left-0` / `-left-60` which have no impact on
 *     containing-block formation.
 *
 * Expected counterexample on unfixed code:
 *   isOpen=true  → aside.className contains 'transform' and 'translate-x-0'
 *                  (compiles to transform: matrix(1,0,0,1,0,0) — containing-block violation)
 *   isOpen=false → aside.className contains 'transform' and '-translate-x-full'
 *                  (compiles to transform: matrix(1,0,0,1,-240,0) — containing-block violation)
 *
 * Validates: Requirements 2.1, 2.2, 2.4
 */

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { Sidebar } from '../Sidebar';

// ── Mock Sidebar's context dependencies ──────────────────────────────────────

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false }),
}));

vi.mock('../../../context/ProjectsContext', () => ({
  useProjects: () => ({ recent: [], hasMore: false, loading: false }),
}));

// SVG imports resolve to their path strings in vitest — no mock needed.

// ── Helper: render Sidebar and return the <aside> element ───────────────────

function renderSidebar(isOpen) {
  const { container } = render(
    <MemoryRouter>
      <Sidebar isOpen={isOpen} onClose={() => {}} />
    </MemoryRouter>
  );
  return container.querySelector('aside');
}

// ── Bug Condition Tests ──────────────────────────────────────────────────────
//
// These assertions encode the EXPECTED (fixed) behavior:
//   <aside> must NOT carry the `transform` base class or any `translate-x-*` class.
//
// On UNFIXED code they WILL FAIL because the className still contains those classes.
// That failure is the SUCCESS case — it proves the bug exists.

describe('Bug Condition — Sidebar <aside> must not apply a CSS transform on mobile viewports', () => {
  describe('Property 1: isOpen=true (sidebar visible on mobile)', () => {
    let aside;

    beforeEach(() => {
      aside = renderSidebar(true);
    });

    it('EXPECTED (fails on unfixed code): <aside> does not carry the `transform` Tailwind base class', () => {
      // `transform` base class compiles to `transform: translateX(0)` —
      // a non-`none` computed transform that creates a new containing block.
      // Counterexample on unfixed code: className contains 'transform'
      const classes = aside.className.split(/\s+/);
      expect(classes).not.toContain('transform');
    });

    it('EXPECTED (fails on unfixed code): <aside> does not carry `translate-x-0` when open', () => {
      // `translate-x-0` compiles to `transform: translateX(0)` — same violation.
      // Counterexample on unfixed code: className contains 'translate-x-0'
      const classes = aside.className.split(/\s+/);
      expect(classes).not.toContain('translate-x-0');
    });

    it('EXPECTED (fails on unfixed code): <aside> does not use `translate-x-0` or any translate-based positioning when open', () => {
      // After the fix, no translate-x-* class should be present at all.
      // Counterexample on unfixed code: className contains 'translate-x-0'
      // (This is the same assertion as the second test above — both prove the same bug,
      //  but this frames it as "the open state must not use a translate class".)
      const classes = aside.className.split(/\s+/);
      const translateClasses = classes.filter(c => c.includes('translate-x-'));
      expect(translateClasses).toHaveLength(0);
    });
  });

  describe('Property 1: isOpen=false (sidebar off-screen on mobile)', () => {
    let aside;

    beforeEach(() => {
      aside = renderSidebar(false);
    });

    it('EXPECTED (fails on unfixed code): <aside> does not carry the `transform` Tailwind base class when closed', () => {
      // Even when closed, `transform` base class is present on unfixed code.
      // Counterexample on unfixed code: className contains 'transform'
      const classes = aside.className.split(/\s+/);
      expect(classes).not.toContain('transform');
    });

    it('EXPECTED (fails on unfixed code): <aside> does not carry `-translate-x-full` when closed', () => {
      // `-translate-x-full` compiles to `transform: translateX(-100%)` —
      // the containing-block violation remains even when sidebar is off-screen.
      // Counterexample on unfixed code: className contains '-translate-x-full'
      const classes = aside.className.split(/\s+/);
      expect(classes).not.toContain('-translate-x-full');
    });

    it('EXPECTED (fails on unfixed code): <aside> uses `-left-60` (not translate) to position when closed', () => {
      // After the fix, the closed state is expressed as left: -240px, not a transform.
      // Counterexample on unfixed code: className does not contain '-left-60'
      const classes = aside.className.split(/\s+/);
      expect(classes).toContain('-left-60');
    });
  });

  describe('Property 1: transition property must not animate transform', () => {
    it('EXPECTED (fails on unfixed code): transition class does not transition `transform`', () => {
      // `transition-[transform,background-color,border-color]` is present on unfixed code.
      // After the fix it becomes `transition-[left,background-color,border-color]`.
      // Counterexample on unfixed code: className contains the transform-based transition class
      const aside = renderSidebar(true);
      expect(aside.className).not.toMatch(/transition-\[transform,/);
    });

    it('EXPECTED (fails on unfixed code): transition class animates `left` instead', () => {
      // After the fix, the transition property transitions `left`.
      // Counterexample on unfixed code: className does not contain the left-based transition class
      const aside = renderSidebar(true);
      expect(aside.className).toMatch(/transition-\[left,/);
    });
  });
});
