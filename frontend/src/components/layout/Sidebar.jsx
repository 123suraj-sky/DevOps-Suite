import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils';
import dashboardIcon from '../../assets/07_dashboard.svg';
import projectsIcon from '../../assets/08_folder.svg';
import metricsIcon from '../../assets/10_metrics.svg';
import notificationsIcon from '../../assets/09_notification_bell.svg';

const baseNavLinks = [
  { path: '/', label: 'Dashboard', icon: dashboardIcon, iconAlt: 'Dashboard' },
  { path: '/projects', label: 'Projects', icon: projectsIcon, iconAlt: 'Projects' },
  { path: '/metrics', label: 'Metrics', icon: metricsIcon, iconAlt: 'Metrics', adminOnly: true },
  { path: '/notifications', label: 'Notifications', icon: notificationsIcon, iconAlt: 'Notifications' },
];

export const Sidebar = ({ isOpen = true, onClose }) => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navLinks = baseNavLinks.filter(link => !link.adminOnly || isAdmin);

  return (
    <>
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform lg:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-center h-16 border-b border-gray-200">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary-600">DevOps Suite</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                location.pathname === link.path
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
              onClick={onClose}
            >
              <img src={link.icon} alt={link.iconAlt} className="w-5 h-5 object-contain" />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
};
