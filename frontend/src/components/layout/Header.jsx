import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatRelativeTime } from '../../utils/formatters';
import { getDefaultAvatar } from '../../utils';
import notificationBellIcon from '../../assets/09_notification_bell.svg';

export const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationsRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-10 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      <div className="flex items-center space-x-4">
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <img src={notificationBellIcon} alt="Notifications" className="w-5 h-5 object-contain" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${!n.read ? 'bg-primary-50' : ''}`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center justify-center p-1 rounded-full hover:ring-2 hover:ring-primary-300 transition-all focus:outline-none"
            title={user?.displayName || user?.email || 'User Menu'}
          >
            {user?.avatarUrl || user?.avatar_url ? (
              <img
                src={user.avatarUrl || user.avatar_url}
                alt={user.displayName || user.email || 'User Avatar'}
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
              />
            ) : getDefaultAvatar(user?.gender) ? (
              <img
                src={getDefaultAvatar(user?.gender)}
                alt={user?.gender === 'FEMALE' ? 'Female User' : 'Male User'}
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.displayName || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <Link
                to="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowUserMenu(false)}
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
