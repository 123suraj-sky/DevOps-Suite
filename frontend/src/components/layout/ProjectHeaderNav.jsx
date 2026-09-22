import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils';

const TabLink = ({ to, isActive, children }) => (
  <Link
    to={to}
    className={cn(
      'px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
      'border-b-2 -mb-px',
      isActive
        ? 'border-[var(--accent)] text-[var(--accent-text)]'
        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
    )}
    aria-current={isActive ? 'page' : undefined}
  >
    {children}
  </Link>
);

export const ProjectHeaderNav = ({ projectId, projectName, projectDescription }) => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const base = `/projects/${projectId}`;
  const isOverview = location.pathname === base;
  const isTasks    = location.pathname === `${base}/tasks`;
  const isCode     = location.pathname === `${base}/code`;
  const isLogs     = location.pathname === `${base}/logs`;

  return (
    <div className="bg-[var(--surface-raised)] border-b border-[var(--border-subtle)]">
      {/* Project name + description */}
      <div className="px-4 lg:px-6 pt-4 pb-3">
        <Link
          to={base}
          className="text-base font-semibold text-[var(--text-primary)] hover:text-[var(--accent-text)] transition-colors"
        >
          {projectName || 'Project'}
        </Link>
        {projectDescription && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{projectDescription}</p>
        )}
      </div>

      {/* Tab bar */}
      <nav
        className="flex items-end px-4 lg:px-6"
        aria-label="Project sections"
      >
        <TabLink to={base}           isActive={isOverview}>Overview</TabLink>
        <TabLink to={`${base}/tasks`} isActive={isTasks}>Task Board</TabLink>
        <TabLink to={`${base}/code`}  isActive={isCode}>Code Editor</TabLink>
        {isAdmin && (
          <TabLink to={`${base}/logs`} isActive={isLogs}>Logs</TabLink>
        )}
      </nav>
    </div>
  );
};
