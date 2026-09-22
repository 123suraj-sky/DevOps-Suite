import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { metricsApi } from '../../api';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { useTheme } from '../../context/ThemeContext';

import folderIcon    from '../../assets/08_folder.svg';
import checkIcon     from '../../assets/11_check.svg';
import clockIcon     from '../../assets/14_clock.svg';
import syncIcon      from '../../assets/38_sync.svg';
import lightningIcon from '../../assets/12_lightning.svg';
import usersIcon     from '../../assets/41_users.svg';
import plusIcon      from '../../assets/20_plus.svg';
import grafanaIcon   from '../../assets/39_grafana.svg';
import kibanaIcon    from '../../assets/40_kibana.svg';
import fullscreenIcon from '../../assets/37_fullscreen.svg';
import closeIcon     from '../../assets/26_x.svg';

const TIME_RANGES = ['1h', '6h', '24h', '7d', '30d'];

const STATUS_STYLES = {
  COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  FAILED:    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  TIMEOUT:   'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  OOM_KILLED:'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  RUNNING:   'bg-[var(--accent-subtle)] text-[var(--accent-text)]',
  QUEUED:    'bg-[var(--surface-sunken)] text-[var(--text-secondary)]',
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

const StatCard = ({ icon, label, value, colorClass = 'text-[var(--text-primary)]', tintClass = '' }) => (
  <Card className={`flex items-center gap-4 ${tintClass}`}>
    <div className="w-10 h-10 rounded-lg bg-[var(--surface-sunken)] flex items-center justify-center shrink-0">
      <img src={icon} alt="" className="w-5 h-5 dark:brightness-0 dark:invert opacity-70" aria-hidden="true" />
    </div>
    <div className="min-w-0">
      <p className="text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-widest truncate">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums mt-0.5 ${colorClass}`}>{value}</p>
    </div>
  </Card>
);

export const AdminDashboard = () => {
  const { isDark } = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');

  const [isDetailsOpen, setIsDetailsOpen]   = useState(false);
  const [detailsTitle, setDetailsTitle]     = useState('');
  const [requestsData, setRequestsData]     = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestQuery, setRequestQuery]     = useState('');

  // Chart colours driven by CSS vars
  const chartGrid    = isDark ? '#2a2a2a' : '#e8e8e8';
  const chartAxis    = isDark ? '#5a5a5a' : '#909090';
  const chartBg      = isDark ? '#1a1a1a' : '#ffffff';
  const chartBorder  = isDark ? '#2a2a2a' : '#e8e8e8';
  const chartText    = isDark ? '#f0f0f0' : '#111111';
  const accentColor  = isDark ? '#22d3ee' : '#0891b2';

  const openDetailsModal = async (title) => {
    setDetailsTitle(title);
    setIsDetailsOpen(true);
    setRequestsLoading(true);
    try {
      const data = await metricsApi.getRequests(requestQuery);
      setRequestsData(data || []);
    } catch { /* silent */ }
    finally { setRequestsLoading(false); }
  };

  const handleSearchRequests = async (e) => {
    e?.preventDefault();
    setRequestsLoading(true);
    try {
      const data = await metricsApi.getRequests(requestQuery);
      setRequestsData(data || []);
    } catch { /* silent */ }
    finally { setRequestsLoading(false); }
  };

  const fetchDashboard = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true); else setRefreshing(true);
    try {
      const data = await metricsApi.getDashboard('default', timeRange);
      setDashboard(data);
      setError('');
    } catch (err) {
      if (!isBackground) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => fetchDashboard(true), 10000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading && !dashboard) return (
    <div className="space-y-6 page-enter">
      <div>
        <Skeleton className="h-7 w-48 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map((n) => <Skeleton.StatCard key={n} />)}
      </div>
      <Skeleton.Card rows={3} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton.Card rows={5} />
        <Skeleton.Card rows={5} />
      </div>
    </div>
  );
  if (error && !dashboard) return (
    <div className="mt-20 text-center">
      <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      <Button variant="ghost" onClick={() => fetchDashboard()} className="mt-3">Retry</Button>
    </div>
  );

  const {
    projectCount = 0, taskSummary = {}, serviceHealth = [],
    throughput = [], latency = [], recentExecutions = [], recentActivity = []
  } = dashboard ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Admin Dashboard</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-[var(--text-secondary)]">Live platform operations</span>
            {refreshing && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <img src={syncIcon} alt="" className="w-3 h-3 animate-spin dark:brightness-0 dark:invert opacity-60" aria-hidden="true" />
                Updating
              </span>
            )}
          </div>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] p-0.5 rounded-md self-start sm:self-auto" role="group" aria-label="Time range">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                timeRange === r
                  ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              aria-pressed={timeRange === r}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={folderIcon} label="Total Projects"  value={projectCount} />
        <StatCard icon={syncIcon}   label="In Progress"     value={taskSummary.inProgress ?? 0} />
        <StatCard icon={clockIcon}  label="Pending"         value={taskSummary.todo ?? 0}        colorClass="text-amber-600 dark:text-amber-400" />
        <StatCard icon={checkIcon}  label="Completed"       value={taskSummary.done ?? 0}        colorClass="text-green-600 dark:text-green-400" />
      </div>

      {/* Service Health */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <img src={lightningIcon} alt="" className="w-4 h-4 dark:brightness-0 dark:invert opacity-60" aria-hidden="true" />
            Infrastructure Health
          </h2>
          <span className="text-xs text-[var(--text-muted)]">Live heartbeat</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {serviceHealth.map((svc) => {
            const isUp = svc.status === 'UP';
            return (
              <div
                key={svc.serviceName}
                className={`p-3 rounded-md border-l-2 ${isUp ? 'border-l-green-500' : 'border-l-red-500'} bg-[var(--surface-sunken)] border border-[var(--border-subtle)]`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{svc.serviceName}</p>
                  <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${isUp ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                    {svc.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                  {svc.responseTimeMs} ms
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Throughput */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Request Throughput (RPM)</h2>
              <span className="text-xs text-[var(--text-muted)] font-mono">Window: {timeRange}</span>
            </div>
            <button
              onClick={() => openDetailsModal('Throughput & HTTP Traffic Details')}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-sunken)] hover:bg-[var(--border-subtle)] rounded border border-[var(--border-subtle)] transition-colors"
            >
              <img src={fullscreenIcon} alt="" className="w-3 h-3 dark:brightness-0 dark:invert opacity-60" aria-hidden="true" />
              Details
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughput}>
                <defs>
                  <linearGradient id="fillRPM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={accentColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="time" tick={{ fill: chartAxis, fontSize: 11 }} />
                <YAxis tick={{ fill: chartAxis, fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: chartBg, borderColor: chartBorder, color: chartText, fontSize: 12 }} />
                <Legend wrapperStyle={{ color: chartAxis, fontSize: 11 }} />
                <Area type="monotone" dataKey="RPM"    stroke={accentColor} fill="url(#fillRPM)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="errors" stroke="#ef4444" fillOpacity={0.15} fill="#ef4444" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Latency */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Request Latency (ms)</h2>
              <span className="text-xs text-[var(--text-muted)] font-mono">Window: {timeRange}</span>
            </div>
            <button
              onClick={() => openDetailsModal('Request Latency & Response Time Details')}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-sunken)] hover:bg-[var(--border-subtle)] rounded border border-[var(--border-subtle)] transition-colors"
            >
              <img src={fullscreenIcon} alt="" className="w-3 h-3 dark:brightness-0 dark:invert opacity-60" aria-hidden="true" />
              Details
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latency}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="time" tick={{ fill: chartAxis, fontSize: 11 }} />
                <YAxis tick={{ fill: chartAxis, fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: chartBg, borderColor: chartBorder, color: chartText, fontSize: 12 }} />
                <Legend wrapperStyle={{ color: chartAxis, fontSize: 11 }} />
                <Bar dataKey="p50" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="p99" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Operational shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/projects',    icon: plusIcon,    label: 'Manage Projects' },
          { to: '/admin/users', icon: usersIcon,   label: 'User Activity' },
          { to: '/kibana',      icon: kibanaIcon,  label: 'Kibana Logs' },
          { to: '/grafana',     icon: grafanaIcon, label: 'Grafana Metrics' },
        ].map(({ to, icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2.5 p-3 bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-lg hover:border-[var(--accent-border)] hover:bg-[var(--accent-subtle)] transition-colors group"
          >
            <img src={icon} alt="" className="w-4 h-4 shrink-0 dark:brightness-0 dark:invert opacity-50 group-hover:opacity-80" aria-hidden="true" />
            <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{label}</span>
          </Link>
        ))}
      </div>

      {/* Activity & Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <img src={lightningIcon} alt="" className="w-4 h-4 dark:brightness-0 dark:invert opacity-60" aria-hidden="true" />
              Recent Executions
            </h2>
            <span className="text-xs text-[var(--text-muted)]">Sandbox runs</span>
          </div>
          {recentExecutions?.length > 0 ? (
            <ul className="divide-y divide-[var(--border-subtle)]" role="list">
              {recentExecutions.map((exec) => (
                <li key={exec.executionId} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-[var(--surface-sunken)] text-[var(--text-secondary)] capitalize">
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
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">No recent code executions.</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <img src={checkIcon} alt="" className="w-4 h-4 dark:brightness-0 dark:invert opacity-60" aria-hidden="true" />
              Platform Task Activity
            </h2>
            <span className="text-xs text-[var(--text-muted)]">Cross-project</span>
          </div>
          {recentActivity?.length > 0 ? (
            <ul className="divide-y divide-[var(--border-subtle)]" role="list">
              {recentActivity.map((event, idx) => (
                <li key={idx} className="flex items-start gap-3 py-2.5">
                  <img src={checkIcon} alt="" className="w-3.5 h-3.5 mt-0.5 shrink-0 dark:brightness-0 dark:invert opacity-40" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-primary)] font-medium truncate">{event.description}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{relativeTime(event.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">No recent task activity.</p>
          )}
        </Card>
      </div>

      {/* Detailed View Modal */}
      {isDetailsOpen && (
        <div
          onClick={() => setIsDetailsOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--surface-overlay)] rounded-lg border border-[var(--border-subtle)] shadow-dark-lg max-w-4xl w-full max-h-[85vh] flex flex-col modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label={detailsTitle}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-sunken)] rounded-t-lg">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{detailsTitle}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Live HTTP telemetry from Elasticsearch</p>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
                aria-label="Close"
              >
                <img src={closeIcon} alt="" className="w-4 h-4 dark:brightness-0 dark:invert" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-hidden flex flex-col">
              <form onSubmit={handleSearchRequests} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Filter by endpoint, method, or status (e.g. /api/tasks, POST, 200)..."
                  value={requestQuery}
                  onChange={(e) => setRequestQuery(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-25"
                />
                <Button type="submit" variant="secondary" size="sm" loading={requestsLoading}>
                  Filter
                </Button>
              </form>

              {requestsLoading ? (
                <div className="py-16 flex justify-center"><Spinner size="md" /></div>
              ) : requestsData.length === 0 ? (
                <div className="py-16 text-center text-sm text-[var(--text-muted)]">
                  No request logs found matching the query.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                  {requestsData.map((req, idx) => {
                    const code = Number(req.status || 200);
                    const methodStyle =
                      req.method === 'GET'    ? 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]' :
                      req.method === 'POST'   ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      req.method === 'PUT'    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' :
                      req.method === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                                'bg-[var(--surface-sunken)] text-[var(--text-secondary)]';
                    const statusStyle =
                      code >= 200 && code < 300 ? 'text-green-600 dark:text-green-400' :
                      code >= 400 && code < 500 ? 'text-amber-600 dark:text-amber-400' :
                      code >= 500               ? 'text-red-600 dark:text-red-400' :
                                                  'text-[var(--text-secondary)]';
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:bg-[var(--border-subtle)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-2xs font-bold uppercase shrink-0 ${methodStyle}`}>
                            {req.method || 'GET'}
                          </span>
                          <span className="font-medium text-[var(--text-primary)] truncate" title={req.uri}>
                            {req.uri || '/'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`font-semibold text-xs ${statusStyle}`}>{req.status || 200}</span>
                          <span className="text-[var(--text-muted)] w-16 text-right">{req.durationMs ?? 0} ms</span>
                          <span className="text-[var(--text-muted)] text-2xs w-20 text-right">{relativeTime(req.timestamp)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] flex justify-between items-center rounded-b-lg">
              <span className="text-xs text-[var(--text-muted)]">
                {requestsData.length} request{requestsData.length !== 1 ? 's' : ''} shown
              </span>
              <Button variant="secondary" size="sm" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
