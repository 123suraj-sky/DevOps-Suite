import { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationItem } from '../../components/common/NotificationItem';
import { Spinner } from '../../components/common';
import notificationBellIcon from '../../assets/09_notification_bell.svg';

const TABS = [
  { id: 'all',    label: 'All' },
  { id: 'unread', label: 'Unread' },
];

export const NotificationsPage = () => {
  const {
    notifications, unreadCount, hasMore,
    markAsRead, markAllAsRead, deleteNotification, loadMore, refresh,
  } = useNotifications();

  const [activeTab,    setActiveTab]    = useState('all');
  const [loading,      setLoading]      = useState(false);
  const [loadingMore,  setLoadingMore]  = useState(false);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    try { await loadMore(); } finally { setLoadingMore(false); }
  }, [loadMore]);

  const displayed = activeTab === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-[var(--accent-text)] hover:underline font-medium transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] p-0.5 rounded-md w-fit" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {tab.id === 'unread' && unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-2xs font-bold text-white bg-red-500 rounded-full leading-none" aria-hidden="true">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {loading ? (
        <Spinner className="py-16" />
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center mb-4">
            <img src={notificationBellIcon} alt="" className="w-7 h-7 opacity-30 dark:brightness-0 dark:invert" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {activeTab === 'unread' ? 'All caught up' : 'No notifications yet'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">
            {activeTab === 'unread'
              ? 'You have no unread notifications.'
              : "When you're assigned tasks or added to projects, you'll see them here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2" role="list">
          {displayed.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))}

          {activeTab === 'all' && hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--accent-text)] border border-[var(--accent-border)] rounded-lg hover:bg-[var(--accent-subtle)] disabled:opacity-50 transition-colors"
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading
                  </>
                ) : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
