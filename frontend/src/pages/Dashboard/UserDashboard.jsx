import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { metricsApi } from '../../api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { Skeleton } from '../../components/common/Skeleton';
import checkIcon from '../../assets/11_check.svg';
import lightningIcon from '../../assets/12_lightning.svg';
import diamondIcon from '../../assets/13_diamond.svg';
import folderIcon from '../../assets/08_folder.svg';

const STATUS_STYLES = {
  COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  FAILED:    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  TIMEOUT:   'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  OOM_KILLED:'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  RUNNING:   'bg-[var(--accent-subtle)] text-[var(--accent-text)]',
  QUEUED:    'bg-[var(--surface-sunken)] text-[var(--text-secondary)]',
};

const ACTIVITY_ICONS = {
  TASK_UPDATED:  checkIcon,
  CODE_EXECUTED: lightningIcon,
};

function relativeTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const StatPill = ({ label, value, colorClass = 'text-[var(--text-primary)]' }) => (
  <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
    <span className="text-sm text-[var(--text-secondary)]">{label}</span>
    <span className={`text-xl font-semibold tabular-nums ${colorClass}`}>{value}</span>
  </div>
);

export const UserDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    metricsApi.getUserSummary()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load your summary'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6 page-enter">
      <div>
        <Skeleton className="h-7 w-40 mb-1" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Skeleton.Card rows={4} />
          <Skeleton.Card rows={4} />
        </div>
        <div className="space-y-5">
          <Skeleton.Card rows={4} />
          <Skeleton.Card rows={2} />
        </div>
      </div>
    </div>
  );
  if (error)   return (
    <div className="mt-20 text-center">
      <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      <Button variant="ghost" onClick={() => window.location.reload()} className="mt-3">Retry</Button>
    </div>
  );

  const { taskStats, executionsThisWeek, recentExecutions, recentActivity } = summary ?? {};

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">Your work at a glance.</p>
      </div>

      {/* Two-column layout: main content + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — 2/3 wide: executions + activity */}
        <div className="lg:col-span-2 space-y-5">

          {/* Recent Executions */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <img src={lightningIcon} alt="" className="w-4 h-4 dark:brightness-0 dark:invert opacity-60" aria-hidden="true" />
                Recent Code Runs
              </h2>
            </div>
            {recentExecutions?.length > 0 ? (
              <ul className="divide-y divide-[var(--border-subtle)]" role="list">
                {recentExecutions.map((exec) => (
                  <li key={exec.executionId} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono bg-[var(--surface-sunken)] text-[var(--text-secondary)] capitalize">
                        {exec.language}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {exec.executionTimeMs > 0 ? `${exec.executionTimeMs}ms` : '--'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[exec.status] ?? 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]'}`}>
                        {exec.status}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] w-14 text-right">{relativeTime(exec.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--text-muted)] py-4 text-center">No executions yet. Open a project and run some code.</p>
            )}
          </Card>

          {/* Activity feed */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <img src={checkIcon} alt="" className="w-4 h-4 dark:brightness-0 dark:invert opacity-60" aria-hidden="true" />
                Recent Activity
              </h2>
            </div>
            {recentActivity?.length > 0 ? (
              <ul className="divide-y divide-[var(--border-subtle)]" role="list">
                {recentActivity.map((event, idx) => (
                  <li key={idx} className="flex items-start gap-3 py-2.5">
                    <img
                      src={ACTIVITY_ICONS[event.type] ?? diamondIcon}
                      alt=""
                      className="w-4 h-4 mt-0.5 shrink-0 dark:brightness-0 dark:invert opacity-50"
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">{event.description}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{relativeTime(event.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--text-muted)] py-4 text-center">No recent activity.</p>
            )}
          </Card>
        </div>

        {/* Right — 1/3: task stats + quick actions */}
        <div className="space-y-5">
          {/* Task status summary */}
          <Card>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Task Summary</h2>
            <StatPill label="Open / Backlog"  value={taskStats?.open ?? 0} />
            <StatPill label="In Progress"     value={taskStats?.inProgress ?? 0} colorClass="text-amber-600 dark:text-amber-400" />
            <StatPill label="Completed"       value={taskStats?.completed ?? 0} colorClass="text-green-600 dark:text-green-400" />
            <StatPill label="Runs this week"  value={executionsThisWeek ?? 0} />
          </Card>

          {/* Quick actions */}
          <Card>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <Link
                to="/projects"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border-subtle)]"
              >
                <img src={folderIcon} alt="" className="w-4 h-4 dark:brightness-0 dark:invert opacity-50 shrink-0" aria-hidden="true" />
                Go to Projects
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
