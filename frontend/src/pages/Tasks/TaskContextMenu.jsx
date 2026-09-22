import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import editIcon      from '../../assets/17_edit.svg';
import duplicateIcon from '../../assets/23_duplicate.svg';
import trashIcon     from '../../assets/18_trash.svg';
import arrowRightIcon from '../../assets/24_arrow_right.svg';

const MENU_WIDTH  = 192;
const MENU_HEIGHT = 300;

export const TaskContextMenu = ({
  x, y, task, columns, isAdminOrOwner,
  onMoveToColumn, onEdit, onDuplicate, onDelete, onClose,
}) => {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const cx = Math.max(8, Math.min(x, window.innerWidth  - MENU_WIDTH  - 8));
  const cy = Math.max(8, Math.min(y, window.innerHeight - MENU_HEIGHT - 8));

  const Item = ({ label, action, icon, danger = false }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); action(); onClose(); }}
      className={[
        'w-full text-left px-3 py-2 text-xs rounded-md transition-colors flex items-center gap-2',
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      {icon && <img src={icon} alt="" className="w-3.5 h-3.5 dark:brightness-0 dark:invert opacity-60 shrink-0" aria-hidden="true" />}
      {label}
    </button>
  );

  const Divider = () => <div className="my-1 border-t border-[var(--border-subtle)]" />;

  const moveTargets = columns.filter((c) => c.id !== task.status);

  const menu = (
    <div
      ref={ref}
      role="menu"
      aria-label="Task actions"
      style={{ top: cy, left: cx, position: 'fixed', zIndex: 9999 }}
      className="bg-[var(--surface-overlay)] border border-[var(--border-subtle)] rounded-lg shadow-dark-md py-1 min-w-[192px] select-none"
    >
      {isAdminOrOwner && (
        <>
          <Item label="Edit Task" action={() => onEdit(task)} icon={editIcon} />
          <Divider />
        </>
      )}

      {moveTargets.length > 0 && (
        <>
          <p className="px-3 pt-1 pb-0.5 text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
            Move to
          </p>
          {moveTargets.map((col) => (
            <Item key={col.id} label={col.title} action={() => onMoveToColumn(task, col.id)} icon={arrowRightIcon} />
          ))}
        </>
      )}

      {isAdminOrOwner && (
        <>
          <Divider />
          <Item label="Duplicate" action={() => onDuplicate(task)} icon={duplicateIcon} />
          <Divider />
          <Item label="Delete" action={() => onDelete(task.id)} icon={trashIcon} danger />
        </>
      )}
    </div>
  );

  return createPortal(menu, document.body);
};
