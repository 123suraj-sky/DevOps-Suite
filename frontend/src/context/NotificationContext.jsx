import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { notificationApi } from '../api';
import { subscribe } from '../services/websocketService';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(undefined);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { connected } = useWebSocket();
  const { user } = useAuth();

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const markAsRead = useCallback(async (id) => {
    await notificationApi.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await notificationApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (id) => {
    await notificationApi.deleteNotification(id);
    setNotifications((prev) => {
      const removed = prev.find((n) => n.id === id);
      const next = prev.filter((n) => n.id !== id);
      if (removed && !removed.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return next;
    });
  }, []);

  // Fetches one page and merges into state. Called on mount and by "load more".
  const loadPage = useCallback(async (pageNum = 0) => {
    try {
      const data = await notificationApi.getAll(pageNum, 20);
      // Spring Page shape: { content: [...], last: bool, totalElements: N }
      const items = data?.content ?? [];
      setNotifications((prev) =>
        pageNum === 0 ? items : [...prev, ...items]
      );
      setHasMore(!data?.last);
      setPage(pageNum);
      // Derive unread count from the fresh first page rather than making a second request
      if (pageNum === 0) {
        const count = await notificationApi.getUnreadCount();
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (hasMore) loadPage(page + 1);
  }, [hasMore, page, loadPage]);

  const refresh = useCallback(() => loadPage(0), [loadPage]);

  // Bug 4 fix: seed notifications list on mount (not just the count)
  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  // Bug 1 fix: subscribe to /topic/notifications/{userId} not /topic/notifications
  useEffect(() => {
    if (connected && user?.userId) {
      const unsub = subscribe(`/topic/notifications/${user.userId}`, (message) => {
        addNotification(message);
      });
      return () => unsub();
    }
  }, [connected, user?.userId, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        hasMore,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        loadMore,
        refresh,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
