import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Right-click context menu for a task card.
 * Rendered via a React Portal into document.body so it is never clipped by
 * DragDropContext, overflow:hidden wrappers, or stacking contexts.
 *
 * Props:
 *   x, y               — viewport coordinates of the right-click
 *   task               — the task object that was right-clicked
 *   columns            — COLUMNS array [{ id, title }]
 *   isAdminOrOwner     — boolean; when false, Delete and Duplicate are hidden
 *   onMoveToColumn(task, colId)  — move task to a different column/status
 *   onDuplicate(task)            — duplicate the task
 *   onDelete(taskId)             — delete the task
 *   onClose()                    — close the menu
 */

const MENU_WIDTH  = 192; // min-w-48 = 12rem = 192px
const MENU_HEIGHT = 300; // generous estimate

export const TaskContextMenu = ({
  x,
  y,
  task,
  columns,
  isAdminOrOwner,
  onMoveToColumn,
  onDuplicate,
  onDelete,
  onClose,
}) => {
  const ref = useRef(null);

  // Close on any outside mousedown
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Clamp so the menu never clips off the viewport edge
  const clampedX = Math.max(8, Math.min(x, (window.innerWidth  - MENU_WIDTH  - 8)));
  const clampedY = Math.max(8, Math.min(y, (window.innerHeight - MENU_HEIGHT - 8)));

  // ── Reusable item ────────────────────────────────────────────────────────────
  const item = (label, action, opts = {}) => (
    <button
      key={label}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        action();
        onClose();
      }}
      className={[
        'w-full text-left px-3 py-2 text-xs rounded transition-colors flex items-center gap-2',
        opts.danger
          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
          : 'text-gray-700 hover:bg-gray-100',
      ].join(' ')}
    >
      {opts.icon && <span className="w-4 text-center">{opts.icon}</span>}
      {label}
    </button>
  );

  // Columns the task can be moved to (exclude current)
  const moveTargets = columns.filter((c) => c.id !== task.status);

  const menu = (
    <div
      ref={ref}
      role="menu"
      aria-label="Task actions"
      style={{ top: clampedY, left: clampedX, position: 'fixed', zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-lg shadow-2xl py-1.5 min-w-[192px] select-none"
    >
      {/* ── Move to ─────────────────────────────────────────────────────── */}
      {moveTargets.length > 0 && (
        <>
          <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Move to
          </p>
          {moveTargets.map((col) =>
            item(col.title, () => onMoveToColumn(task, col.id), { icon: '→' })
          )}
        </>
      )}

      {/* ── Admin/Owner-only actions ─────────────────────────────────────── */}
      {isAdminOrOwner && (
        <>
          <div className="my-1 mx-2 border-t border-gray-100" />
          {item('Duplicate', () => onDuplicate(task), { icon: '⎘' })}
          <div className="my-1 mx-2 border-t border-gray-100" />
          {item('Delete', () => onDelete(task.id), { icon: '🗑', danger: true })}
        </>
      )}
    </div>
  );

  // Portal into document.body — escapes all overflow/z-index stacking contexts
  return createPortal(menu, document.body);
};
