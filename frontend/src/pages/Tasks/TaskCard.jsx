import { Card } from '../../components/common/Card';

/**
 * Renders a single Kanban task card.
 *
 * Props:
 *   task          — task object from API
 *   isDeleting    — boolean, true while delete is pending for this card
 *   isAdminOrOwner— boolean, true if user has admin/owner permissions
 *   onDelete(e, taskId)       — called when the delete button is clicked
 *   onContextMenu(x, y, task) — called on right-click
 *   onOpenDetail(task)        — called when the title is clicked (opens detail modal)
 *
 * Drag handle props (draggableProps, dragHandleProps) are spread by the parent
 * Draggable wrapper — this component only renders what is inside the card.
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
  // ── Priority badge styling ─────────────────────────────────────────────────
  const priorityStyle =
    task.priority === 'HIGH' || task.priority === 'CRITICAL'
      ? 'bg-red-100 text-red-800'
      : task.priority === 'MEDIUM'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-blue-100 text-blue-800';

  // ── Relative-time helper ───────────────────────────────────────────────────
  const relativeTime = (isoString) => {
    if (!isoString) return null;
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString();
  };

  const createdRel = relativeTime(task.created_at);
  const updatedRel = relativeTime(task.updated_at);

  return (
    <Card
      className="hover:shadow cursor-grab active:cursor-grabbing p-3 space-y-2 bg-white select-none"
      padding="none"
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e.clientX, e.clientY, task);
      }}
    >
      {/* ── Row 1: title + priority + edit/delete ─────────────────────────── */}
      <div className="flex justify-between items-start">
        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 flex-1 min-w-0 mr-2">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onOpenDetail && onOpenDetail(task); }}
            className="text-left hover:text-indigo-600 transition-colors w-full truncate"
            title="View task details"
          >
            {task.title}
          </button>
        </h4>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${priorityStyle}`}>
            {task.priority}
          </span>
          
          {/* Edit button — only for admins and owners */}
          {isAdminOrOwner && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEdit && onEdit(task);
              }}
              title="Edit task"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400
                         hover:text-indigo-600 leading-none p-0.5 rounded hover:bg-indigo-50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}

          {/* Only admins/owners see the delete button */}
          {isAdminOrOwner && (
            <button
              onClick={(e) => onDelete(e, task.id)}
              disabled={isDeleting}
              title="Delete task"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400
                         hover:text-red-500 disabled:opacity-30 leading-none p-0.5 rounded
                         hover:bg-red-50"
            >
              {isDeleting ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: description ─────────────────────────────────────────────── */}
      {task.description && (
        <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
      )}

      {/* ── Row 3: due date (if set) ────────────────────────────────────── */}
      {task.due_date && (
        <div className="flex items-center pt-0.5">
          <span className="text-[10px] text-gray-400 whitespace-nowrap">
            📅 {new Date(task.due_date).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* ── Row 4: audit timestamps (tooltip on created label) ───────────── */}
      {createdRel && (
        <div className="flex items-center gap-1 pt-0.5">
          <span
            title={
              [
                task.created_by_name ? `Created by ${task.created_by_name}` : null,
                task.updated_at ? `Last modified ${updatedRel}${task.last_modified_by_name ? ` by ${task.last_modified_by_name}` : ''}` : null,
              ]
                .filter(Boolean)
                .join('\n') || undefined
            }
            className="text-[10px] text-gray-400 cursor-default"
          >
            Created {createdRel}
            {task.created_by_name && (
              <span className="text-gray-300"> · {task.created_by_name}</span>
            )}
          </span>
        </div>
      )}
    </Card>
  );
};
