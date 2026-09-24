import editIcon     from '../../assets/17_edit.svg';
import trashIcon    from '../../assets/18_trash.svg';
import calendarIcon from '../../assets/19_calendar.svg';

/**
 * Single Kanban task card.
 * Uses CSS group pattern for hover reveals — no JS filter hacks.
 * Priority is communicated via both color AND left border (not color-only).
 */
export const TaskCard = ({
  task,
  isDeleting,
  isAdminOrOwner,
  onDelete,
  onEdit,
  onContextMenu,
  onOpenDetail,
}) => {
  const priorityBorder =
    task.priority === 'HIGH' || task.priority === 'CRITICAL'
      ? 'border-l-red-500'
      : task.priority === 'MEDIUM'
      ? 'border-l-amber-400'
      : 'border-l-transparent';

  const priorityBadge =
    task.priority === 'HIGH' || task.priority === 'CRITICAL'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      : task.priority === 'MEDIUM'
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
      : 'bg-[var(--surface-sunken)] text-[var(--text-muted)]';

  const relativeTime = (isoString) => {
    if (!isoString) return null;
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 30 ? `${days}d ago` : new Date(isoString).toLocaleDateString();
  };

  const createdRel = relativeTime(task.created_at);

  return (
    <div
      className={`group relative bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] border-l-2 ${priorityBorder} p-3 space-y-2 select-none hover:border-[var(--border-strong)] hover:border-l-2 transition-all`}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e.clientX, e.clientY, task);
      }}
    >
      {/* Row 1: title + action buttons */}
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenDetail?.(task); }}
          className="text-left text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-text)] transition-colors line-clamp-2 flex-1 min-w-0"
          title="View task details"
        >
          {task.title}
        </button>

        {/* Priority badge + action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-2xs px-1.5 py-0.5 rounded font-medium ${priorityBadge}`}>
            {task.priority}
          </span>

          {isAdminOrOwner && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}
                title="Edit task"
                className="p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-[var(--surface-sunken)] transition-all focus:opacity-100"
                aria-label="Edit task"
              >
                <img src={editIcon} alt="" className="w-3.5 h-3.5 dark:brightness-0 dark:invert" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(e, task.id); }}
                disabled={isDeleting}
                title="Delete task"
                className="p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:opacity-100 disabled:opacity-30"
                aria-label="Delete task"
              >
                {isDeleting ? (
                  <svg className="w-3.5 h-3.5 animate-spin text-red-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <img src={trashIcon} alt="" className="w-3.5 h-3.5 dark:brightness-0 dark:invert opacity-70 hover:opacity-100 group-hover:text-red-500" aria-hidden="true" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{task.description}</p>
      )}

      {/* Footer: due date + created */}
      <div className="flex items-center justify-between pt-0.5">
        {task.due_date ? (
          <span className="text-2xs text-[var(--text-muted)] flex items-center gap-1">
            <img src={calendarIcon} alt="" className="w-3 h-3 dark:brightness-0 dark:invert opacity-40" aria-hidden="true" />
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        ) : <span />}

        {createdRel && (
          <span
            className="text-2xs text-[var(--text-muted)]"
            title={[
              task.created_by_name ? `Created by ${task.created_by_name}` : null,
              task.updated_at ? `Updated ${relativeTime(task.updated_at)}` : null,
            ].filter(Boolean).join(' · ')}
          >
            {createdRel}
          </span>
        )}
      </div>
    </div>
  );
};
