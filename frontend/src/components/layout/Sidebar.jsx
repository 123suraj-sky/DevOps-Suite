import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectsContext';
import { cn } from '../../utils';
import dashboardIcon from '../../assets/07_dashboard.svg';
import projectsIcon from '../../assets/08_folder.svg';
import metricsIcon from '../../assets/10_metrics.svg';
import notificationsIcon from '../../assets/09_notification_bell.svg';
import grafanaIcon from '../../assets/39_grafana.svg';
import kibanaIcon from '../../assets/40_kibana.svg';

const baseNavLinks = [
  { path: '/', label: 'Dashboard', icon: dashboardIcon, iconAlt: 'Dashboard' },
  { path: '/projects', label: 'Projects', icon: projectsIcon, iconAlt: 'Projects' },
  { path: '/notifications', label: 'Notifications', icon: notificationsIcon, iconAlt: 'Notifications' },
];

const adminNavLinks = [
  { path: '/metrics', label: 'Metrics', icon: metricsIcon, iconAlt: 'Metrics' },
  { path: '/grafana', label: 'Grafana', icon: grafanaIcon, iconAlt: 'Grafana' },
  { path: '/kibana', label: 'Kibana', icon: kibanaIcon, iconAlt: 'Kibana' },
];

export const Sidebar = ({ isOpen = true, onClose }) => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { recent, hasMore, loading } = useProjects();

  // helper to build a nav link element
  const NavLink = ({ link }) => (
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
  );

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
          'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform lg:transform-none flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-gray-200 shrink-0">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary-600">DevOps Suite</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Main nav links */}
          <nav className="p-4 space-y-1">
            {baseNavLinks.map((link) => (
              <NavLink key={link.path} link={link} />
            ))}
          </nav>

          {/* Admin tools section — only visible to ROLE_ADMIN / ROLE_OWNER */}
          {isAdmin && (
            <div className="px-4 pb-2">
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Admin
              </p>
              <div className="space-y-1">
                {adminNavLinks.map((link) => (
                  <NavLink key={link.path} link={link} />
                ))}
              </div>
            </div>
          )}

          {/* ── Recent Projects ─────────────────────────────────────────── */}
          <div className="px-4 pb-4">
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Recent Projects
            </p>

            {loading ? (
              /* Skeleton */
              <div className="space-y-1 px-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-7 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="px-3 text-xs text-gray-400 italic">No projects yet</p>
            ) : (
              <div className="space-y-0.5">
                {recent.map((project) => {
                  const projectId = project.id ?? project.projectId;
                  const isActive  = location.pathname.startsWith(`/projects/${projectId}`);
                  return (
                    <Link
                      key={projectId}
                      to={`/projects/${projectId}`}
                      title={project.name}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors group',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <img
                        src={projectsIcon}
                        alt=""
                        aria-hidden="true"
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 object-contain',
                          isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'
                        )}
                      />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  );
                })}

                {/* "All projects" link — only when there are more than 5 */}
                {hasMore && (
                  <Link
                    to="/projects"
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-primary-600 hover:text-primary-800 hover:bg-primary-50 transition-colors font-medium"
                  >
                    All projects →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
