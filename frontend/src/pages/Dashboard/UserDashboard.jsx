import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { metricsApi } from '../../api';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';
import checkIcon from '../../assets/11_check.svg';
import lightningIcon from '../../assets/12_lightning.svg';
import diamondIcon from '../../assets/13_diamond.svg';

const STATUS_STYLES = {
  COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  FAILED:    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  TIMEOUT:   'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  OOM_KILLED:'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  RUNNING:   'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  QUEUED:    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
};

const ACTIVITY_ICONS = {
  TASK_UPDATED: checkIcon,
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

export const UserDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await metricsApi.getUserSummary();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load your summary');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return <Spinner size="lg" className="mt-20" />;
  if (error) return <div className="text-center mt-20 text-red-500 dark:text-red-400">{error}</div>;

  const { taskStats, executionsThisWeek, recentExecutions, recentActivity } = summary ?? {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Dashboard</h1>

      {/* Personal stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">My Open Tasks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{taskStats?.open ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{taskStats?.inProgress ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{taskStats?.completed ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Executions This Week</p>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{executionsThisWeek ?? 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Code Executions */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Executions</h2>
          {recentExecutions?.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentExecutions.map((exec) => (
                <li key={exec.executionId} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 capitalize">
                      {exec.language}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {exec.executionTimeMs > 0 ? `${exec.executionTimeMs}ms` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[exec.status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                      {exec.status}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-16 text-right">
                      {relativeTime(exec.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No executions yet.</p>
          )}
        </Card>

        {/* Activity feed */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h2>
          {recentActivity?.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentActivity.map((event, idx) => (
                <li key={idx} className="flex items-start space-x-3 py-2">
                  <span className="text-base leading-none mt-0.5">
                    <img
                      src={ACTIVITY_ICONS[event.type] ?? diamondIcon}
                      alt={event.type}
                      className="w-4 h-4 object-contain"
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{event.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{relativeTime(event.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No recent activity.</p>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-4">
        <Link
          to="/projects"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
        >
          View My Projects
        </Link>
        <Link
          to="/projects"
          className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
        >
          Run Code
        </Link>
      </div>
    </div>
  );
};
