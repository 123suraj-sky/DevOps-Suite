import { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationItem } from '../../components/common/NotificationItem';
import { Spinner } from '../../components/common';
import notificationBellIcon from '../../assets/09_notification_bell.svg';

/** Filter tab definitions */
const TABS = [
  { id: 'all',    label: 'All' },
  { id: 'unread', label: 'Unread' },
];

export const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    refresh,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Refresh the list whenever the page mounts
  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      await loadMore();
    } finally {
      setLoadingMore(false);
    }
  }, [loadMore]);

  /** Filtered view — 'unread' tab hides already-read items */
  const displayed = activeTab === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Spinner className="py-16" />
      ) : displayed.length === 0 ? (
        <EmptyNotifications activeTab={activeTab} />
      ) : (
        <div className="space-y-2">
          {displayed.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))}

          {/* Load more — only shown in "All" tab where pagination applies */}
          {activeTab === 'all' && hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 disabled:opacity-50 transition-colors"
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Shown when the filtered list is empty */
const EmptyNotifications = ({ activeTab }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <img src={notificationBellIcon} alt="" className="w-8 h-8 opacity-40" />
    </div>
    <h3 className="text-base font-semibold text-gray-900">
      {activeTab === 'unread' ? 'All caught up!' : 'No notifications yet'}
    </h3>
    <p className="text-sm text-gray-500 mt-1 max-w-xs">
      {activeTab === 'unread'
        ? 'You have no unread notifications.'
        : "When you're assigned tasks or added to projects, you'll see them here."}
    </p>
  </div>
);
