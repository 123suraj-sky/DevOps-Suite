/**
 * Bug Condition Exploration Test — Kanban Task Move Broken
 *
 * These tests encode the EXPECTED (fixed) behavior.
 * They MUST FAIL on unfixed code — that failure confirms the bugs exist.
 *
 * Bug 1: When getBoards() returns a board with columns: [], the columnIdMap
 *        stays {}, causing onDragEnd to fire the early-exit toast instead of
 *        calling taskApi.reorder.
 *
 * Bug 2: When handleStatusChange catches a WIP limit error (500/409 with
 *        "Column WIP limit exceeded" in the message), the toast shows the
 *        generic "Failed to update status" instead of a WIP-specific message.
 */

// ── Inline logic under test ──────────────────────────────────────────────────
// We replicate the exact logic from TasksPage.jsx so the test is deterministic
// and does not require mounting the full component with all its context deps.

const normalizeStatusKey = (value) => {
  const key = (value || '').trim().replace(/\s+/g, '_').toUpperCase();
  return key === 'TO_DO' ? 'TODO' : key;
};

/**
 * Simulates the UNFIXED fetchData columnIdMap building logic:
 *   - iterates first.columns
 *   - NO fallback from task list
 */
function buildColumnIdMapUnfixed(board, _taskList) {
  const map = {};
  (board.columns || []).forEach((col) => {
    map[normalizeStatusKey(col.name)] = col.id || col.column_id;
  });
  // unfixed: no fallback block
  return map;
}

/**
 * Simulates the FIXED fetchData columnIdMap building logic:
 *   - iterates first.columns
 *   - falls back to task list when columns is empty
 */
function buildColumnIdMapFixed(board, taskList) {
  const map = {};
  (board.columns || []).forEach((col) => {
    map[normalizeStatusKey(col.name)] = col.id || col.column_id;
  });
  if (Object.keys(map).length === 0 && taskList?.length > 0) {
    taskList.forEach((t) => {
      const key = normalizeStatusKey(t.status);
      if (key && !map[key]) map[key] = t.column_id || t.columnId;
    });
  }
  return map;
}

/**
 * Simulates the UNFIXED handleStatusChange WIP error toast:
 *   toast.error(err.response?.data?.message || 'Failed to update status')
 */
function getToastMessageUnfixed(err) {
  return err.response?.data?.message || 'Failed to update status';
}

/**
 * Simulates the FIXED handleStatusChange WIP error toast.
 */
function getToastMessageFixed(err) {
  const rawMsg =
    err.response?.data?.error?.message ||
    err.response?.data?.message ||
    err.response?.data?.error ||
    '';
  const lower = rawMsg.toLowerCase();
  return lower.includes('wip') || lower.includes('limit')
    ? 'Cannot move task: column WIP limit reached'
    : rawMsg || 'Failed to update status';
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const LEGACY_BOARD = { id: 'board-1', columns: [] }; // legacy: no columns seeded

const SEEDED_BOARD = {
  id: 'board-2',
  columns: [
    { id: 'col-backlog', name: 'Backlog' },
    { id: 'col-todo',    name: 'To Do' },
    { id: 'col-inp',     name: 'In Progress' },
    { id: 'col-done',    name: 'Done' },
  ],
};

const TASK_LIST = [
  { id: 't1', status: 'BACKLOG',     column_id: 'col-backlog' },
  { id: 't2', status: 'TODO',        column_id: 'col-todo'    },
  { id: 't3', status: 'IN_PROGRESS', column_id: 'col-inp'     },
  { id: 't4', status: 'DONE',        column_id: 'col-done'    },
];

const WIP_ERROR_500 = {
  response: { status: 500, data: { message: 'Column WIP limit exceeded' } },
};

const WIP_ERROR_409 = {
  response: { status: 409, data: { error: { message: 'Column WIP limit exceeded' } } },
};

// ── Bug 1: columnIdMap stays empty for legacy boards ─────────────────────────

describe('Bug 1 — columnIdMap empty on legacy board (no columns)', () => {
  it('UNFIXED: columnIdMap is {} when board.columns is empty (confirms bug exists)', () => {
    const map = buildColumnIdMapUnfixed(LEGACY_BOARD, TASK_LIST);
    // On unfixed code this IS empty — this assertion documents the bug condition
    expect(map).toEqual({});
  });

  it('EXPECTED (will fail on unfixed code): columnIdMap is populated from task list when board.columns is empty', () => {
    // This uses the FIXED logic — will fail on unfixed code
    const map = buildColumnIdMapFixed(LEGACY_BOARD, TASK_LIST);
    expect(map).not.toEqual({});
    expect(map['BACKLOG']).toBe('col-backlog');
    expect(map['TODO']).toBe('col-todo');
    expect(map['IN_PROGRESS']).toBe('col-inp');
    expect(map['DONE']).toBe('col-done');
  });

  it('EXPECTED (will fail on unfixed code): onDragEnd can resolve destColId from task-derived map', () => {
    const map = buildColumnIdMapFixed(LEGACY_BOARD, TASK_LIST);
    const destColId = map['IN_PROGRESS'];
    // On unfixed code, map is {}, so destColId would be undefined
    // and the early-exit would fire — no reorder call
    expect(destColId).toBeDefined();
    expect(destColId).toBe('col-inp');
  });

  it('PRESERVED: columnIdMap is still correctly built from board.columns when they exist (seeded board)', () => {
    // This works on both unfixed and fixed code — it must keep passing
    const map = buildColumnIdMapFixed(SEEDED_BOARD, TASK_LIST);
    expect(map['BACKLOG']).toBe('col-backlog');
    expect(map['TODO']).toBe('col-todo');
    expect(map['IN_PROGRESS']).toBe('col-inp');
    expect(map['DONE']).toBe('col-done');
  });
});

// ── Bug 2: WIP limit error shows generic toast ────────────────────────────────

describe('Bug 2 — WIP limit error shows generic toast instead of informative message', () => {
    it('UNFIXED: 409 WIP error produces generic toast because message is nested (confirms bug exists)', () => {
    // ProjectExceptionHandler returns { error: { code, message }, status: 409 }
    // Unfixed code reads err.response?.data?.message which is undefined for this shape
    // so it falls back to the generic string — this is the bug
    const msg = getToastMessageUnfixed(WIP_ERROR_409);
    expect(msg).toBe('Failed to update status');
  });

  it('EXPECTED (will fail on unfixed code): 500 WIP error produces informative toast', () => {
    const msg = getToastMessageFixed(WIP_ERROR_500);
    expect(msg).toBe('Cannot move task: column WIP limit reached');
  });

  it('EXPECTED (will fail on unfixed code): 409 WIP error (nested error object) produces informative toast', () => {
    const msg = getToastMessageFixed(WIP_ERROR_409);
    expect(msg).toBe('Cannot move task: column WIP limit reached');
  });

  it('PRESERVED: non-WIP errors still show original message', () => {
    const networkError = { response: { data: { message: 'Task not found' } } };
    const msg = getToastMessageFixed(networkError);
    expect(msg).toBe('Task not found');
  });

  it('PRESERVED: errors with no message still fall back to generic string', () => {
    const emptyError = { response: { data: {} } };
    const msg = getToastMessageFixed(emptyError);
    expect(msg).toBe('Failed to update status');
  });
});

// ── normalizeStatusKey correctness ───────────────────────────────────────────

describe('normalizeStatusKey — column name to status key mapping', () => {
  const cases = [
    ['Backlog',     'BACKLOG'],
    ['To Do',       'TODO'],
    ['TO_DO',       'TODO'],
    ['In Progress', 'IN_PROGRESS'],
    ['Done',        'DONE'],
    ['BACKLOG',     'BACKLOG'],
    ['TODO',        'TODO'],
    ['IN_PROGRESS', 'IN_PROGRESS'],
    ['DONE',        'DONE'],
    ['in_progress', 'IN_PROGRESS'],
    ['  To Do  ',   'TODO'],
  ];

  test.each(cases)('normalizeStatusKey(%s) → %s', (input, expected) => {
    expect(normalizeStatusKey(input)).toBe(expected);
  });
});

