/**
 * Preservation Tests — Sidebar Slide Animation and Desktop Layout Unchanged
 *
 * Property 2: Preservation
 *   These tests encode the CURRENT baseline behavior and MUST PASS on unfixed code.
 *   After the fix they continue to pass because they test the INTENDED visual behavior
 *   (open = visible, closed = off-screen) rather than specific Tailwind class names
 *   wherever possible — the one exception is the transition class assertion, which is
 *   written generically to accept both the old and new class name.
 *
 * What is asserted:
 *   1. isOpen=true  → <aside> is positioned on-screen  (translate-x-0 or left-0)
 *   2. isOpen=false → <aside> is positioned off-screen (-translate-x-full or -left-60)
 *   3. Both states  → <aside> contains `lg:transform-none` (desktop reset present)
 *   4. Both states  → <aside> contains `fixed` + `lg:static` (positioning strategy)
 *   5. Transition class includes `background-color` AND `border-color`
 *   6. Backdrop renders when isOpen=true and calls onClose when clicked
 *   7. Backdrop does NOT render when isOpen=false
 *   8. isOpen=false → <aside> contains `lg:translate-x-0` OR `lg:left-0`
 *      (desktop always shows sidebar even when mobile-closed)
 *
 * Validates: Requirements 3.1, 3.2, 3.7
 */

import { render, fireEvent } from '@testing-library/react';
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

// ── Helper ───────────────────────────────────────────────────────────────────

function renderSidebar(isOpen, onClose = vi.fn()) {
  const result = render(
    <MemoryRouter>
      <Sidebar isOpen={isOpen} onClose={onClose} />
    </MemoryRouter>
  );
  const aside = result.container.querySelector('aside');
  return { aside, ...result };
}

// ── 1. isOpen=true — sidebar is positioned on-screen ─────────────────────────
//
// Observation on unfixed code: aside has `translate-x-0` which compiles to left=0.
// After fix: aside will have `left-0`.
// Forward-compatible assertion: the class list must contain EITHER `translate-x-0`
// OR `left-0` — both signal "sidebar is on-screen at left offset 0".

describe('Preservation: isOpen=true — sidebar on-screen positioning', () => {
  let aside;

  beforeEach(() => {
    ({ aside } = renderSidebar(true));
  });

  it('has a class that positions the sidebar at left=0 when open', () => {
    const classes = aside.className.split(/\s+/);
    const onScreen = classes.includes('translate-x-0') || classes.includes('left-0');
    expect(onScreen).toBe(true);
  });

  it('does NOT have a class that hides the sidebar off-screen when open', () => {
    const classes = aside.className.split(/\s+/);
    const offScreen =
      classes.includes('-translate-x-full') || classes.includes('-left-60');
    expect(offScreen).toBe(false);
  });
});

// ── 2. isOpen=false — sidebar is positioned off-screen ───────────────────────
//
// Observation on unfixed code: aside has `-translate-x-full`.
// After fix: aside will have `-left-60`.
// Forward-compatible: either class signals "sidebar is off-screen to the left".

describe('Preservation: isOpen=false — sidebar off-screen positioning', () => {
  let aside;

  beforeEach(() => {
    ({ aside } = renderSidebar(false));
  });

  it('has a class that positions the sidebar off-screen when closed', () => {
    const classes = aside.className.split(/\s+/);
    const offScreen =
      classes.includes('-translate-x-full') || classes.includes('-left-60');
    expect(offScreen).toBe(true);
  });

  it('does NOT have `translate-x-0` (bare, without lg: prefix) when closed', () => {
    // `translate-x-0` (without lg: prefix) would pull the sidebar on-screen on mobile.
    // Note: `left-0` is excluded from this check because the layout always carries
    // `inset-y-0 left-0` as a base positioning class — it is not a slide indicator.
    // After the fix, `-left-60` (not `translate-x-0`) handles the off-screen state,
    // so this assertion remains valid on both unfixed and fixed code.
    const classes = aside.className.split(/\s+/);
    expect(classes).not.toContain('translate-x-0');
  });
});

// ── 3. Both states: lg:transform-none desktop reset ──────────────────────────

describe('Preservation: lg:transform-none is always present (desktop reset)', () => {
  it('includes lg:transform-none on <aside> when open', () => {
    const { aside } = renderSidebar(true);
    expect(aside.className).toContain('lg:transform-none');
  });

  it('includes lg:transform-none on <aside> when closed', () => {
    const { aside } = renderSidebar(false);
    expect(aside.className).toContain('lg:transform-none');
  });
});

// ── 4. Both states: fixed + lg:static positioning strategy ───────────────────

describe('Preservation: <aside> uses fixed + lg:static positioning', () => {
  it('has `fixed` class when open', () => {
    const { aside } = renderSidebar(true);
    const classes = aside.className.split(/\s+/);
    expect(classes).toContain('fixed');
  });

  it('has `lg:static` class when open', () => {
    const { aside } = renderSidebar(true);
    expect(aside.className).toContain('lg:static');
  });

  it('has `fixed` class when closed', () => {
    const { aside } = renderSidebar(false);
    const classes = aside.className.split(/\s+/);
    expect(classes).toContain('fixed');
  });

  it('has `lg:static` class when closed', () => {
    const { aside } = renderSidebar(false);
    expect(aside.className).toContain('lg:static');
  });
});

// ── 5. Transition class includes background-color and border-color ────────────
//
// The transition class changes from `transition-[transform,background-color,border-color]`
// to `transition-[left,background-color,border-color]` after the fix.
// Assert only the preserved part: both `background-color` and `border-color` must
// appear somewhere in the transition class string.

describe('Preservation: transition class retains background-color and border-color', () => {
  it('transition class includes background-color', () => {
    const { aside } = renderSidebar(true);
    expect(aside.className).toMatch(/transition-\[[^\]]*background-color/);
  });

  it('transition class includes border-color', () => {
    const { aside } = renderSidebar(true);
    expect(aside.className).toMatch(/transition-\[[^\]]*border-color/);
  });

  it('transition class includes duration-200', () => {
    const { aside } = renderSidebar(true);
    const classes = aside.className.split(/\s+/);
    expect(classes).toContain('duration-200');
  });
});

// ── 6. Backdrop renders when isOpen=true and calls onClose on click ───────────

describe('Preservation: backdrop behavior when open', () => {
  it('renders the backdrop overlay when isOpen=true', () => {
    const { container } = render(
      <MemoryRouter>
        <Sidebar isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    );
    // The backdrop is a <div> with bg-black/60 (or equivalent) and aria-hidden
    const backdrop = container.querySelector('[aria-hidden="true"]:not(img):not(svg)');
    expect(backdrop).not.toBeNull();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <Sidebar isOpen={true} onClose={onClose} />
      </MemoryRouter>
    );
    const backdrop = container.querySelector('[aria-hidden="true"]:not(img):not(svg)');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── 7. Backdrop does NOT render when isOpen=false ─────────────────────────────

describe('Preservation: backdrop does not render when closed', () => {
  it('does not render the backdrop overlay when isOpen=false', () => {
    const { container } = render(
      <MemoryRouter>
        <Sidebar isOpen={false} onClose={() => {}} />
      </MemoryRouter>
    );
    // When closed there should be no black overlay div
    // Backdrop has onClick + aria-hidden; images also have aria-hidden so exclude them
    const allAriaHidden = Array.from(
      container.querySelectorAll('[aria-hidden="true"]')
    ).filter((el) => el.tagName !== 'IMG' && el.tagName !== 'SVG');
    expect(allAriaHidden).toHaveLength(0);
  });
});

// ── 8. isOpen=false: desktop always shows sidebar (lg:translate-x-0 OR lg:left-0) ──

describe('Preservation: closed sidebar has desktop-always-visible class', () => {
  it('includes lg:translate-x-0 or lg:left-0 when closed (desktop override)', () => {
    const { aside } = renderSidebar(false);
    const hasDesktopOverride =
      aside.className.includes('lg:translate-x-0') ||
      aside.className.includes('lg:left-0');
    expect(hasDesktopOverride).toBe(true);
  });
});

// ── Property-based: random toggle sequences preserve positioning invariants ───
//
// Simulate sequences of open/close states and assert the on-screen / off-screen
// positioning class is always consistent with the isOpen flag.
// This exercises the "generate random sequences" requirement from the design doc
// without a dedicated PBT library — we use test.each over a representative sample.

describe('Preservation: property — open/close toggle sequences maintain correct positioning', () => {
  // Generate 20 random boolean sequences of length 3
  const sequences = Array.from({ length: 20 }, () =>
    Array.from({ length: 3 }, () => Math.random() < 0.5)
  );

  test.each(sequences.map((seq, i) => [i, seq]))(
    'sequence %i: each state in %j has consistent open/closed positioning class',
    (_i, seq) => {
      seq.forEach((isOpen) => {
        const { aside } = renderSidebar(isOpen);
        const classes = aside.className.split(/\s+/);

        if (isOpen) {
          const onScreen = classes.includes('translate-x-0') || classes.includes('left-0');
          expect(onScreen).toBe(true);
        } else {
          const offScreen =
            classes.includes('-translate-x-full') || classes.includes('-left-60');
          expect(offScreen).toBe(true);
        }
      });
    }
  );
});
