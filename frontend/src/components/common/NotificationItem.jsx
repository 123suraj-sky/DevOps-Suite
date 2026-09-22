import { formatRelativeTime } from '../../utils';
import taskAssignedIcon   from '../../assets/31_task_assigned.svg';
import projectJoinedIcon  from '../../assets/32_project_joined.svg';
import roleChangedIcon    from '../../assets/33_role_changed.svg';
import projectRemovedIcon from '../../assets/34_project_removed.svg';
import taskCompletedIcon  from '../../assets/35_task_completed.svg';
import executionFailedIcon from '../../assets/36_execution_failed.svg';
import notificationBellIcon from '../../assets/09_notification_bell.svg';
import trashIcon          from '../../assets/18_trash.svg';

const TYPE_META = {
  TASK_ASSIGNED:   { icon: taskAssignedIcon,   dot: 'bg-[var(--accent)]' },
  TASK_REASSIGNED: { icon: taskAssignedIcon,   dot: 'bg-[var(--accent)]' },
  TASK_COMPLETED:  { icon: taskCompletedIcon,  dot: 'bg-green-500' },
  PROJECT_JOINED:  { icon: projectJoinedIcon,  dot: 'bg-green-500' },
  ROLE_CHANGED:    { icon: roleChangedIcon,    dot: 'bg-amber-500' },
  PROJECT_REMOVED: { icon: projectRemovedIcon, dot: 'bg-red-500' },
  EXECUTION_FAILED:{ icon: executionFailedIcon,dot: 'bg-red-500' },
};

const DEFAULT_META = { icon: notificationBellIcon, dot: 'bg-[var(--text-muted)]' };

/**
 * Notification row for both the header dropdown (compact) and the full inbox page.
 */
export const NotificationItem = ({ notification, onMarkAsRead, onDelete, compact = false }) => {
  const meta = TYPE_META[notification.type] ?? DEFAULT_META;

  const handleClick = () => {
    if (!notification.read && onMarkAsRead) onMarkAsRead(notification.id);
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className={`px-4 py-3 border-b border-[var(--border-subtle)] cursor-pointer transition-colors ${
          !notification.read
            ? 'bg-[var(--accent-subtle)] hover:brightness-95'
            : 'hover:bg-[var(--surface-sunken)]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center">
            <img src={meta.icon} alt="" className="w-3.5 h-3.5 dark:brightness-0 dark:invert opacity-70" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{notification.title}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{notification.message}</p>
            <p className="text-2xs text-[var(--text-muted)] mt-1">{formatRelativeTime(notification.createdAt)}</p>
          </div>
          {!notification.read && (
            <span className={`flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-label="Unread" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="listitem"
      className={`group flex items-start gap-4 px-4 py-4 rounded-lg border transition-colors ${
        !notification.read
          ? 'bg-[var(--accent-subtle)] border-[var(--accent-border)]'
          : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]'
      }`}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center">
        <img src={meta.icon} alt="" className="w-4 h-4 dark:brightness-0 dark:invert opacity-70" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${notification.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-label="Unread" />
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">{notification.message}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">{formatRelativeTime(notification.createdAt)}</p>
      </div>

      {/* Actions (visible on hover or focus-within) */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        {!notification.read && onMarkAsRead && (
          <button
            onClick={handleClick}
            title="Mark as read"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-text)] hover:bg-[var(--accent-subtle)] transition-colors focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Mark as read"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(notification.id)}
            title="Delete"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Delete notification"
          >
            <img src={trashIcon} alt="" className="w-3.5 h-3.5 dark:brightness-0 dark:invert opacity-70" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};
