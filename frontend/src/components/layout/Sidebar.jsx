import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectsContext';
import { cn } from '../../utils';
import logoIcon from '../../assets/42_logo.svg';
import dashboardIcon from '../../assets/07_dashboard.svg';
import projectsIcon from '../../assets/08_folder.svg';
import notificationsIcon from '../../assets/09_notification_bell.svg';
import grafanaIcon from '../../assets/39_grafana.svg';
import kibanaIcon from '../../assets/40_kibana.svg';
import usersIcon from '../../assets/41_users.svg';

const baseNavLinks = [
  { path: '/',              label: 'Dashboard',     icon: dashboardIcon,      iconAlt: 'Dashboard' },
  { path: '/projects',      label: 'Projects',      icon: projectsIcon,       iconAlt: 'Projects' },
  { path: '/notifications', label: 'Notifications', icon: notificationsIcon,  iconAlt: 'Notifications' },
];

const adminNavLinks = [
  { path: '/admin/users', label: 'User Activity',     icon: usersIcon,  iconAlt: 'User Activity' },
  { path: '/grafana',     label: 'Grafana',           icon: grafanaIcon, iconAlt: 'Grafana' },
  { path: '/kibana',      label: 'Kibana',            icon: kibanaIcon,  iconAlt: 'Kibana' },
];

const NavLink = ({ link, onClose }) => {
  const location = useLocation();
  const isActive = location.pathname === link.path;

  return (
    <Link
      to={link.path}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group',
        isActive
          ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <img
        src={link.icon}
        alt=""
        aria-hidden="true"
        className={cn(
          'w-4 h-4 shrink-0 object-contain',
          isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-80',
          // Only invert when not active (active state uses accent tint)
          !isActive && 'dark:brightness-0 dark:invert'
        )}
      />
      <span>{link.label}</span>
    </Link>
  );
};

export const Sidebar = ({ isOpen = true, onClose }) => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { recent, hasMore, loading } = useProjects();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-30',
          'w-60 flex flex-col shrink-0',
          'bg-[var(--surface-raised)] border-r border-[var(--border-subtle)]',
          'transition-[left,background-color,border-color] duration-200 lg:transform-none',
          isOpen ? 'left-0' : '-left-60 lg:left-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-[var(--border-subtle)] shrink-0">
          <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center shrink-0">
              <img src={logoIcon} alt="DevOps Suite" className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">DevOps Suite</span>
          </Link>
        </div>

        {/* Scrollable nav content */}
        <div className="flex-1 overflow-y-auto py-3">
          {/* Main nav */}
          <nav className="px-3 space-y-0.5" aria-label="Main navigation">
            {baseNavLinks.map((link) => (
              <NavLink key={link.path} link={link} onClose={onClose} />
            ))}
          </nav>

          {/* Admin section */}
          {isAdmin && (
            <div className="px-3 mt-4">
              <p className="px-3 mb-1 text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                Admin
              </p>
              <div className="space-y-0.5">
                {adminNavLinks.map((link) => (
                  <NavLink key={link.path} link={link} onClose={onClose} />
                ))}
              </div>
            </div>
          )}

          {/* Recent Projects */}
          <div className="px-3 mt-4">
            <p className="px-3 mb-1 text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
              Recent Projects
            </p>

            {loading ? (
              <div className="space-y-1 px-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton h-7 rounded" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="px-3 text-xs text-[var(--text-muted)] italic">No projects yet</p>
            ) : (
              <div className="space-y-0.5">
                {recent.map((project) => {
                  const projectId = project.id ?? project.projectId;
                  const isActive = location.pathname.startsWith(`/projects/${projectId}`);
                  return (
                    <Link
                      key={projectId}
                      to={`/projects/${projectId}`}
                      title={project.name}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors group',
                        isActive
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <img
                        src={projectsIcon}
                        alt=""
                        aria-hidden="true"
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 object-contain',
                          isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-60',
                          !isActive && 'dark:brightness-0 dark:invert'
                        )}
                      />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  );
                })}
                {hasMore && (
                  <Link
                    to="/projects"
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--accent-text)] hover:bg-[var(--surface-sunken)] transition-colors font-medium"
                  >
                    All projects
                    <svg className="w-3 h-3 ml-auto" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
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
