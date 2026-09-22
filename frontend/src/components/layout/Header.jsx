import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { getDefaultAvatar } from '../../utils';
import { NotificationItem } from '../common/NotificationItem';
import notificationBellIcon from '../../assets/09_notification_bell.svg';
import sunIcon from '../../assets/43_sun.svg';
import moonIcon from '../../assets/44_moon.svg';

export const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications();
  const { isDark, toggleTheme } = useTheme();
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

  const iconBtn = `p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]
    hover:bg-[var(--surface-sunken)] transition-colors
    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]`;

  return (
    <header className="sticky top-0 z-10 h-14 bg-[var(--surface-raised)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className={`lg:hidden ${iconBtn}`}
        aria-label="Open navigation menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
        </svg>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={iconBtn}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="relative w-4 h-4 block">
            <img
              src={sunIcon}
              alt=""
              className={`absolute inset-0 w-4 h-4 transition-opacity duration-200 dark:brightness-0 dark:invert ${isDark ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden="true"
            />
            <img
              src={moonIcon}
              alt=""
              className={`absolute inset-0 w-4 h-4 transition-opacity duration-200 dark:brightness-0 dark:invert ${isDark ? 'opacity-0' : 'opacity-100'}`}
              aria-hidden="true"
            />
          </span>
        </button>

        {/* Notification bell */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative ${iconBtn}`}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-haspopup="true"
            aria-expanded={showNotifications}
          >
            <img
              src={notificationBellIcon}
              alt=""
              className="w-4 h-4 dark:brightness-0 dark:invert"
              aria-hidden="true"
            />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-2xs font-bold text-white bg-red-500 rounded-full leading-none"
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] bg-[var(--surface-overlay)] rounded-lg border border-[var(--border-subtle)] shadow-dark-md max-h-96 overflow-y-auto z-50"
              role="region"
              aria-label="Notifications panel"
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--surface-overlay)]">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">Notifications</h3>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-[var(--accent-text)] hover:underline transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    See all
                  </Link>
                </div>
              </div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--text-muted)]">No notifications</div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkAsRead={markAsRead}
                    compact
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative ml-1" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
            aria-label="User menu"
            aria-haspopup="true"
            aria-expanded={showUserMenu}
          >
            {user?.avatarUrl || user?.avatar_url ? (
              <img
                src={user.avatarUrl || user.avatar_url}
                alt={user.displayName || user.email || 'User'}
                className="w-7 h-7 rounded-full object-cover border border-[var(--border-subtle)]"
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
              />
            ) : getDefaultAvatar(user?.gender) ? (
              <img
                src={getDefaultAvatar(user?.gender)}
                alt={user?.gender === 'FEMALE' ? 'User avatar' : 'User avatar'}
                className="w-7 h-7 rounded-full object-cover border border-[var(--border-subtle)]"
              />
            ) : (
              <div className="w-7 h-7 bg-[var(--accent-subtle)] border border-[var(--accent-border)] rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-[var(--accent-text)]">
                  {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 mt-2 w-52 bg-[var(--surface-overlay)] rounded-lg border border-[var(--border-subtle)] shadow-dark-md py-1 z-20"
              role="menu"
            >
              <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {user?.displayName || 'User'}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{user?.email}</p>
              </div>
              <Link
                to="/profile"
                role="menuitem"
                className="block px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                Profile
              </Link>
              <button
                role="menuitem"
                onClick={() => { setShowUserMenu(false); logout(); }}
                className="block w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] transition-colors"
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
