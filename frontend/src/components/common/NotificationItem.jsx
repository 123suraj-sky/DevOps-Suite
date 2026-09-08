import { formatRelativeTime } from '../../utils';
import taskAssignedIcon from '../../assets/31_task_assigned.svg';
import projectJoinedIcon from '../../assets/32_project_joined.svg';
import roleChangedIcon from '../../assets/33_role_changed.svg';
import projectRemovedIcon from '../../assets/34_project_removed.svg';
import taskCompletedIcon from '../../assets/35_task_completed.svg';
import executionFailedIcon from '../../assets/36_execution_failed.svg';
import notificationBellIcon from '../../assets/09_notification_bell.svg';
import trashIcon from '../../assets/18_trash.svg';

/** Maps a notification type string to its icon asset and a background tint. */
const TYPE_META = {
  TASK_ASSIGNED:   { icon: taskAssignedIcon,   bg: 'bg-indigo-50',  dot: 'bg-indigo-500' },
  TASK_REASSIGNED: { icon: taskAssignedIcon,   bg: 'bg-indigo-50',  dot: 'bg-indigo-500' },
  TASK_COMPLETED:  { icon: taskCompletedIcon,  bg: 'bg-green-50',   dot: 'bg-green-500'  },
  PROJECT_JOINED:  { icon: projectJoinedIcon,  bg: 'bg-green-50',   dot: 'bg-green-500'  },
  ROLE_CHANGED:    { icon: roleChangedIcon,    bg: 'bg-amber-50',   dot: 'bg-amber-500'  },
  PROJECT_REMOVED: { icon: projectRemovedIcon, bg: 'bg-red-50',     dot: 'bg-red-500'    },
  EXECUTION_FAILED:{ icon: executionFailedIcon,bg: 'bg-red-50',     dot: 'bg-red-500'    },
};

const DEFAULT_META = { icon: notificationBellIcon, bg: 'bg-gray-50', dot: 'bg-gray-400' };

/**
 * A single notification row used in both the header dropdown and the full inbox page.
 *
 * Props:
 *   notification  – the notification object from the backend
 *   onMarkAsRead  – (id) => void
 *   onDelete      – (id) => void  (optional — hidden in dropdown)
 *   compact       – bool — if true, renders in condensed dropdown mode
 */
export const NotificationItem = ({ notification, onMarkAsRead, onDelete, compact = false }) => {
  const meta = TYPE_META[notification.type] ?? DEFAULT_META;

  const handleClick = () => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
          !notification.read ? 'bg-primary-50' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center`}>
            <img src={meta.icon} alt="" className="w-4 h-4 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.createdAt)}</p>
          </div>
          {!notification.read && (
            <span className={`flex-shrink-0 mt-1.5 w-2 h-2 rounded-full ${meta.dot}`} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-start gap-4 px-4 py-4 rounded-lg border transition-colors ${
        !notification.read
          ? 'bg-primary-50 border-primary-100 hover:bg-primary-100'
          : 'bg-white border-gray-100 hover:bg-gray-50'
      }`}
    >
      {/* Type icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${meta.bg} flex items-center justify-center`}>
        <img src={meta.icon} alt="" className="w-5 h-5 object-contain" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className={`flex-shrink-0 w-2 h-2 rounded-full ${meta.dot}`} />
          )}
        </div>
        <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.createdAt)}</p>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && onMarkAsRead && (
          <button
            onClick={handleClick}
            title="Mark as read"
            className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(notification.id)}
            title="Delete"
            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <img src={trashIcon} alt="Delete" className="w-4 h-4 object-contain" />
          </button>
        )}
      </div>
    </div>
  );
};
