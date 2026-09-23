/**
 * Preservation Property Tests — Kanban Task Move Broken
 *
 * These tests encode BASELINE behavior that must NOT regress after the fix.
 * They MUST PASS on the current UNFIXED code.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 *
 * All logic is replicated inline as pure functions — no component mounting
 * required, matching the pattern established in taskMove.bugcondition.test.jsx.
 */

// ── Inline logic replicated from TasksPage.jsx ───────────────────────────────

const normalizeStatusKey = (value) => {
  const key = (value || '').trim().replace(/\s+/g, '_').toUpperCase();
  return key === 'TO_DO' ? 'TODO' : key;
};

/**
 * Replicates the UNFIXED fetchData columnIdMap building logic.
 * Only iterates first.columns — no fallback.
 */
function buildColumnIdMapUnfixed(board, _taskList) {
  const map = {};
  (board.columns || []).forEach((col) => {
    map[normalizeStatusKey(col.name)] = col.id || col.column_id;
  });
  return map;
}

/**
 * Replicates the FIXED fetchData columnIdMap building logic.
 * Iterates first.columns, falls back to task list when columns is empty.
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
 * Replicates the UNFIXED handleStatusChange WIP error toast logic.
 */
function getToastMessageUnfixed(err) {
  return err.response?.data?.message || 'Failed to update status';
}

/**
 * Replicates the FIXED handleStatusChange WIP error toast logic.
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

/**
 * Simulates the WebSocket task list reducer from TasksPage.jsx.
 */
function applyWebSocketUpdate(prev, update) {
  const action   = update?.action;
  const incoming = update?.task;
  const getId    = (t) => t?.id || t?.taskId || t?.task_id;

  if (!action) return prev; // unknown action — no change

  switch (action) {
    case 'CREATED': {
      const id = getId(incoming);
      if (!id || prev.some((t) => getId(t) === id)) return prev;
      return [...prev, incoming];
    }
    case 'UPDATED':
    case 'STATUS_CHANGED':
    case 'MOVED': {
      const id = getId(incoming);
      if (!id) return prev;
      return prev.map((t) => (getId(t) === id ? incoming : t));
    }
    case 'DELETED': {
      const id = update.task_id || update.taskId || getId(incoming);
      if (!id) return prev;
      return prev.filter((t) => getId(t) !== id);
    }
    default:
      return prev;
  }
}

/**
 * Simulates the onDragEnd early-exit guard from TasksPage.jsx.
 * Returns true if the move should be aborted.
 */
function shouldAbortDrag(boardId, destColId) {
  return !boardId || !destColId;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SEEDED_BOARD = {
  id: 'board-2',
  columns: [
    { id: 'col-backlog', name: 'Backlog'     },
    { id: 'col-todo',    name: 'To Do'       },
    { id: 'col-inp',     name: 'In Progress' },
    { id: 'col-done',    name: 'Done'        },
  ],
};

const TASK_LIST = [
  { id: 't1', status: 'BACKLOG',     column_id: 'col-backlog' },
  { id: 't2', status: 'TODO',        column_id: 'col-todo'    },
  { id: 't3', status: 'IN_PROGRESS', column_id: 'col-inp'     },
  { id: 't4', status: 'DONE',        column_id: 'col-done'    },
];

// ── Test 1: columnIdMap from seeded board ────────────────────────────────────

describe('Preservation 1 — columnIdMap from seeded board (non-empty columns)', () => {
  /**
   * Validates: Requirements 3.1, 3.4
   * When the board has 4 seeded columns, BOTH the unfixed and fixed
   * buildColumnIdMap functions produce the same correct 4-entry map.
   * The fallback is never entered for a seeded board.
   */
  it('unfixed: seeded board produces correct 4-entry map', () => {
    const map = buildColumnIdMapUnfixed(SEEDED_BOARD, TASK_LIST);
    expect(map['BACKLOG']).toBe('col-backlog');
    expect(map['TODO']).toBe('col-todo');
    expect(map['IN_PROGRESS']).toBe('col-inp');
    expect(map['DONE']).toBe('col-done');
    expect(Object.keys(map)).toHaveLength(4);
  });

  it('fixed: seeded board produces the same correct 4-entry map (no regression)', () => {
    const map = buildColumnIdMapFixed(SEEDED_BOARD, TASK_LIST);
    expect(map['BACKLOG']).toBe('col-backlog');
    expect(map['TODO']).toBe('col-todo');
    expect(map['IN_PROGRESS']).toBe('col-inp');
    expect(map['DONE']).toBe('col-done');
    expect(Object.keys(map)).toHaveLength(4);
  });

  it('fixed and unfixed produce identical maps when columns are present', () => {
    const unfixedMap = buildColumnIdMapUnfixed(SEEDED_BOARD, TASK_LIST);
    const fixedMap   = buildColumnIdMapFixed(SEEDED_BOARD, TASK_LIST);
    expect(fixedMap).toEqual(unfixedMap);
  });

  it('fallback block is never entered when seeded board columns are non-empty', () => {
    // The fallback runs only when map is empty after iterating columns.
    // With a seeded board, map has 4 entries → fallback condition is false.
    const map = buildColumnIdMapFixed(SEEDED_BOARD, TASK_LIST);
    // If the fallback had run it might have overwritten with task column_ids;
    // but since both sources agree, the outcome is the same — 4 correct entries.
    expect(Object.keys(map).length).toBeGreaterThan(0);
    // Verify the values come from board columns, not task list overrides
    // (they're the same here, confirming no unexpected mutation)
    expect(map['TODO']).toBe('col-todo');
  });
});

// ── Test 2: boardId null guard ───────────────────────────────────────────────

describe('Preservation 2 — boardId null guard in onDragEnd (Req 3.6)', () => {
  /**
   * Validates: Requirements 3.6
   * When boardId is null the early-exit condition fires.
   * This must remain true after the fix.
   */
  it('aborts drag when boardId is null (board not yet loaded)', () => {
    expect(shouldAbortDrag(null, 'col-inp')).toBe(true);
  });

  it('aborts drag when destColId is undefined (column not in map)', () => {
    expect(shouldAbortDrag('board-1', undefined)).toBe(true);
  });

  it('aborts drag when both boardId and destColId are falsy', () => {
    expect(shouldAbortDrag(null, undefined)).toBe(true);
  });

  it('does NOT abort drag when boardId and destColId are both present', () => {
    expect(shouldAbortDrag('board-1', 'col-inp')).toBe(false);
  });

  it('does NOT abort drag for a seeded board with a resolved column', () => {
    const map = buildColumnIdMapUnfixed(SEEDED_BOARD, TASK_LIST);
    const destColId = map['IN_PROGRESS'];
    expect(shouldAbortDrag('board-2', destColId)).toBe(false);
  });
});

// ── Test 3: normalizeStatusKey edge cases ────────────────────────────────────

describe('Preservation 3 — normalizeStatusKey stability (all 11 known mappings)', () => {
  /**
   * Validates: Requirements 3.1, 3.4
   * All display name → status key mappings must remain stable.
   */
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

// ── Test 4: fallback does NOT run when columns are present ───────────────────

describe('Preservation 4 — fallback never runs when board columns are present', () => {
  /**
   * Validates: Requirements 3.1
   * The fixed buildColumnIdMap fallback block must ONLY activate when
   * the board has an empty columns array. When columns are present,
   * both implementations produce the same result.
   */
  it('board with 1 column: unfixed and fixed maps are identical', () => {
    const board = { id: 'b', columns: [{ id: 'c1', name: 'Backlog' }] };
    const tasks = [{ id: 't1', status: 'BACKLOG', column_id: 'c1' }];
    expect(buildColumnIdMapFixed(board, tasks)).toEqual(buildColumnIdMapUnfixed(board, tasks));
  });

  it('board with 4 columns: unfixed and fixed maps are identical', () => {
    expect(buildColumnIdMapFixed(SEEDED_BOARD, TASK_LIST))
      .toEqual(buildColumnIdMapUnfixed(SEEDED_BOARD, TASK_LIST));
  });

  it('board with columns takes priority: task list data does not override board column IDs', () => {
    // Even if a task has a different column_id than the board column, board wins
    const tasksWithDifferentIds = TASK_LIST.map((t) => ({ ...t, column_id: 'stale-id' }));
    const map = buildColumnIdMapFixed(SEEDED_BOARD, tasksWithDifferentIds);
    // Board column IDs should be used, not stale task column_ids
    expect(map['TODO']).toBe('col-todo');   // from board, not 'stale-id'
    expect(map['DONE']).toBe('col-done');   // from board, not 'stale-id'
  });
});

// ── Test 5: non-WIP error messages pass through unchanged ────────────────────

describe('Preservation 5 — non-WIP error messages are unaffected (Req 3.3)', () => {
  /**
   * Validates: Requirements 3.3
   * getToastMessage for 404/403/generic errors must still show the original
   * message, not the WIP-specific message.
   */
  it('404 "Task not found" error shows original message', () => {
    const err = { response: { status: 404, data: { message: 'Task not found' } } };
    expect(getToastMessageFixed(err)).toBe('Task not found');
  });

  it('403 "Forbidden" error shows original message', () => {
    const err = { response: { status: 403, data: { message: 'Forbidden' } } };
    expect(getToastMessageFixed(err)).toBe('Forbidden');
  });

  it('generic "Something went wrong" error shows original message', () => {
    const err = { response: { data: { message: 'Something went wrong' } } };
    expect(getToastMessageFixed(err)).toBe('Something went wrong');
  });

  it('unfixed also passes non-WIP 404 through unchanged', () => {
    const err = { response: { status: 404, data: { message: 'Task not found' } } };
    expect(getToastMessageUnfixed(err)).toBe('Task not found');
  });

  it('unfixed also passes non-WIP 403 through unchanged', () => {
    const err = { response: { status: 403, data: { message: 'Forbidden' } } };
    expect(getToastMessageUnfixed(err)).toBe('Forbidden');
  });
});

// ── Test 6: null/undefined error handling ────────────────────────────────────

describe('Preservation 6 — null/undefined error handling fallback (Req 3.3)', () => {
  /**
   * Validates: Requirements 3.3
   * When err is empty or err.response is undefined, the generic fallback
   * "Failed to update status" must still be shown.
   */
  it('empty error object {} shows "Failed to update status"', () => {
    expect(getToastMessageFixed({})).toBe('Failed to update status');
  });

  it('err.response = undefined shows "Failed to update status"', () => {
    expect(getToastMessageFixed({ response: undefined })).toBe('Failed to update status');
  });

  it('err.response.data = {} shows "Failed to update status"', () => {
    expect(getToastMessageFixed({ response: { data: {} } })).toBe('Failed to update status');
  });

  it('err.response.data.message = "" shows "Failed to update status"', () => {
    expect(getToastMessageFixed({ response: { data: { message: '' } } })).toBe(
      'Failed to update status'
    );
  });

  it('unfixed: empty error {} also shows "Failed to update status"', () => {
    expect(getToastMessageUnfixed({})).toBe('Failed to update status');
  });

  it('unfixed: err.response.data = {} also shows "Failed to update status"', () => {
    expect(getToastMessageUnfixed({ response: { data: {} } })).toBe('Failed to update status');
  });
});

// ── Bonus: WebSocket state reducer preservation ───────────────────────────────

describe('Preservation — WebSocket state reducer (Req 3.5)', () => {
  /**
   * Validates: Requirements 3.5
   * WebSocket CREATED/DELETED/UPDATED/STATUS_CHANGED events update task list
   * correctly and are unaffected by columnIdMap changes.
   */
  const BASE_TASKS = [
    { id: 't1', status: 'TODO',    title: 'Task 1' },
    { id: 't2', status: 'BACKLOG', title: 'Task 2' },
  ];

  it('CREATED event appends new task', () => {
    const newTask = { id: 't3', status: 'IN_PROGRESS', title: 'Task 3' };
    const result  = applyWebSocketUpdate(BASE_TASKS, { action: 'CREATED', task: newTask });
    expect(result).toHaveLength(3);
    expect(result.find((t) => t.id === 't3')).toEqual(newTask);
  });

  it('CREATED event is idempotent (duplicate ignored)', () => {
    const existing = { id: 't1', status: 'TODO', title: 'Task 1 dup' };
    const result   = applyWebSocketUpdate(BASE_TASKS, { action: 'CREATED', task: existing });
    expect(result).toHaveLength(2); // not appended again
  });

  it('DELETED event removes task by id', () => {
    const result = applyWebSocketUpdate(BASE_TASKS, { action: 'DELETED', task_id: 't1' });
    expect(result).toHaveLength(1);
    expect(result.find((t) => t.id === 't1')).toBeUndefined();
  });

  it('UPDATED event replaces matching task', () => {
    const updated = { id: 't1', status: 'DONE', title: 'Task 1 Updated' };
    const result  = applyWebSocketUpdate(BASE_TASKS, { action: 'UPDATED', task: updated });
    expect(result.find((t) => t.id === 't1')?.title).toBe('Task 1 Updated');
    expect(result.find((t) => t.id === 't1')?.status).toBe('DONE');
  });

  it('STATUS_CHANGED event replaces matching task', () => {
    const updated = { id: 't2', status: 'IN_PROGRESS', title: 'Task 2' };
    const result  = applyWebSocketUpdate(BASE_TASKS, { action: 'STATUS_CHANGED', task: updated });
    expect(result.find((t) => t.id === 't2')?.status).toBe('IN_PROGRESS');
  });

  it('unknown action returns list unchanged', () => {
    const result = applyWebSocketUpdate(BASE_TASKS, { action: 'UNKNOWN', task: {} });
    expect(result).toEqual(BASE_TASKS);
  });

  it('null action triggers fetchData path (returns original list unchanged)', () => {
    const result = applyWebSocketUpdate(BASE_TASKS, { task: { id: 't3', status: 'TODO' } });
    expect(result).toEqual(BASE_TASKS);
  });
});
