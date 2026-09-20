import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { metricsApi } from '../../api';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';
import { useTheme } from '../../context/ThemeContext';

import folderIcon from '../../assets/08_folder.svg';
import checkIcon from '../../assets/11_check.svg';
import clockIcon from '../../assets/14_clock.svg';
import syncIcon from '../../assets/38_sync.svg';
import lightningIcon from '../../assets/12_lightning.svg';
import usersIcon from '../../assets/41_users.svg';
import plusIcon from '../../assets/20_plus.svg';
import circleDotIcon from '../../assets/27_circle_dot.svg';
import grafanaIcon from '../../assets/39_grafana.svg';
import kibanaIcon from '../../assets/40_kibana.svg';
import fullscreenIcon from '../../assets/37_fullscreen.svg';
import closeIcon from '../../assets/26_x.svg';

const TIME_RANGES = [
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

const STATUS_STYLES = {
  COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  FAILED:    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  TIMEOUT:   'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  OOM_KILLED:'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  RUNNING:   'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  QUEUED:    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
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

export const AdminDashboard = () => {
  const { isDark } = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState('');
  const [requestsData, setRequestsData] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestQuery, setRequestQuery] = useState('');

  // Recharts theme-aware colours
  const chartGridColor   = isDark ? '#333333' : '#e5e7eb';
  const chartAxisColor   = isDark ? '#9ca3af' : '#6b7280';
  const chartTooltipBg   = isDark ? '#1f1f1f' : '#ffffff';
  const chartTooltipBorder = isDark ? '#333333' : '#e5e7eb';

  const openDetailsModal = async (title) => {
    setDetailsTitle(title);
    setIsDetailsOpen(true);
    setRequestsLoading(true);
    try {
      const data = await metricsApi.getRequests(requestQuery);
      setRequestsData(data || []);
    } catch (e) {
      console.error('Failed to load requests:', e);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleSearchRequests = async (e) => {
    e?.preventDefault();
    setRequestsLoading(true);
    try {
      const data = await metricsApi.getRequests(requestQuery);
      setRequestsData(data || []);
    } catch (e) {
      console.error('Failed to filter requests:', e);
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchDashboard = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
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

  if (loading && !dashboard) return <Spinner size="lg" className="mt-20" />;
  if (error && !dashboard) return <div className="text-center mt-20 text-red-500 dark:text-red-400">{error}</div>;

  const {
    projectCount = 0,
    taskSummary = {},
    serviceHealth = [],
    throughput = [],
    latency = [],
    recentExecutions = [],
    recentActivity = []
  } = dashboard ?? {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500 dark:text-gray-400">Live platform operations &amp; telemetry</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">Auto-refreshing (10s)</span>
            {refreshing && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                <img src={syncIcon} alt="Syncing" className="w-3 h-3 animate-spin" />
                Updating...
              </span>
            )}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg self-start sm:self-auto">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === range.value
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-600/60'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
            <img src={folderIcon} alt="Projects" className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Projects</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projectCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
            <img src={syncIcon} alt="In Progress" className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{taskSummary.inProgress ?? 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <img src={clockIcon} alt="Pending" className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending / Todo</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{taskSummary.todo ?? 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <img src={checkIcon} alt="Completed" className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{taskSummary.done ?? 0}</p>
          </div>
        </Card>
      </div>

      {/* Infrastructure Service Health Panel */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src={lightningIcon} alt="Health" className="w-5 h-5" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Infrastructure Service Health</h2>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">Real-time Heartbeat &amp; Ping</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {serviceHealth.map((svc) => {
            const isUp = svc.status === 'UP';
            return (
              <div
                key={svc.serviceName}
                className="p-3.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{svc.serviceName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Latency: <span className="font-mono">{svc.responseTimeMs} ms</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <img src={circleDotIcon} alt={svc.status} className={`w-3.5 h-3.5 ${isUp ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                    {svc.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Live Telemetry Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Throughput */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Request Throughput (RPM)</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">Window: {timeRange}</span>
            </div>
            <button
              onClick={() => openDetailsModal('Throughput & HTTP Traffic Details')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md border border-gray-200 dark:border-gray-600 transition-colors"
            >
              <img src={fullscreenIcon} alt="Details" className="w-3.5 h-3.5" />
              <span>Detailed View</span>
            </button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughput}>
                <defs>
                  <linearGradient id="adminColorRpm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b7280" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="time" tick={{ fill: chartAxisColor }} />
                <YAxis tick={{ fill: chartAxisColor }} />
                <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, color: isDark ? '#f3f4f6' : '#111827' }} />
                <Legend wrapperStyle={{ color: isDark ? '#d1d5db' : '#374151' }} />
                <Area type="monotone" dataKey="RPM" stroke="#6b7280" fillOpacity={1} fill="url(#adminColorRpm)" />
                <Area type="monotone" dataKey="errors" stroke="#ef4444" fillOpacity={0.2} fill="#ef4444" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Request Latency (ms)</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">Window: {timeRange}</span>
            </div>
            <button
              onClick={() => openDetailsModal('Request Latency & Response Time Details')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md border border-gray-200 dark:border-gray-600 transition-colors"
            >
              <img src={fullscreenIcon} alt="Details" className="w-3.5 h-3.5" />
              <span>Detailed View</span>
            </button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latency}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="time" tick={{ fill: chartAxisColor }} />
                <YAxis tick={{ fill: chartAxisColor }} />
                <Tooltip contentStyle={{ backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, color: isDark ? '#f3f4f6' : '#111827' }} />
                <Legend wrapperStyle={{ color: isDark ? '#d1d5db' : '#374151' }} />
                <Bar dataKey="p50" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="p99" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Operational Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/projects', icon: plusIcon, label: 'Manage Projects', iconColor: 'text-gray-600' },
          { to: '/admin/users', icon: usersIcon, label: 'User Activity', iconColor: 'text-gray-600' },
          { to: '/kibana', icon: kibanaIcon, label: 'Kibana Logs', iconColor: 'text-pink-600' },
          { to: '/grafana', icon: grafanaIcon, label: 'Grafana Dashboards', iconColor: 'text-orange-600' },
        ].map(({ to, icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm transition-all"
          >
            <img src={icon} alt={label} className="w-5 h-5 shrink-0" />
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{label}</span>
          </Link>
        ))}
      </div>

      {/* Activity & Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <img src={lightningIcon} alt="Runs" className="w-4 h-4" />
              Recent Platform Executions
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">Sandbox runs</span>
          </div>
          {recentExecutions?.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentExecutions.map((exec) => (
                <li key={exec.executionId} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
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
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No recent code executions recorded.</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <img src={checkIcon} alt="Activity" className="w-4 h-4" />
              Platform Task Activity
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">Cross-project events</span>
          </div>
          {recentActivity?.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentActivity.map((event, idx) => (
                <li key={idx} className="flex items-start space-x-3 py-2.5">
                  <span className="mt-1 shrink-0">
                    <img src={checkIcon} alt="Activity" className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 dark:text-gray-200 font-medium truncate">{event.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{relativeTime(event.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No recent task activity recorded.</p>
          )}
        </Card>
      </div>

      {/* Detailed View Modal */}
      {isDetailsOpen && (
        <div
          onClick={() => setIsDetailsOpen(false)}
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700 cursor-default"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-700/50 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{detailsTitle}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Live HTTP telemetry events recorded in Elasticsearch (method, endpoint, status, latency)
                </p>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <img src={closeIcon} alt="Close" className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              <form onSubmit={handleSearchRequests} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Filter by endpoint path, method, or status (e.g. /api/tasks, POST, 200)..."
                  value={requestQuery}
                  onChange={(e) => setRequestQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400"
                />
                <button
                  type="submit"
                  disabled={requestsLoading}
                  className="px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg text-xs font-semibold hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Filter
                </button>
              </form>

              {requestsLoading ? (
                <div className="py-16 flex justify-center">
                  <Spinner size="md" />
                </div>
              ) : requestsData.length === 0 ? (
                <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
                  No individual request logs found matching the query.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                  {requestsData.map((req, idx) => {
                    const statusCode = Number(req.status || 200);
                    const isSuccess   = statusCode >= 200 && statusCode < 300;
                    const isRedirect  = statusCode >= 300 && statusCode < 400;
                    const isClientErr = statusCode >= 400 && statusCode < 500;

                    const methodStyle =
                      req.method === 'GET'    ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
                      req.method === 'POST'   ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' :
                      req.method === 'PUT'    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' :
                      req.method === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';

                    const statusStyle =
                      isSuccess   ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700' :
                      isRedirect  ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600' :
                      isClientErr ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700' :
                                    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/40 hover:bg-gray-100/70 dark:hover:bg-gray-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase shrink-0 ${methodStyle}`}>
                            {req.method || 'GET'}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 truncate" title={req.uri}>
                            {req.uri || '/'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <span className={`px-2 py-0.5 rounded font-semibold text-[11px] border ${statusStyle}`}>
                            {req.status || 200}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300 font-semibold w-16 text-right">
                            {req.durationMs ?? 0} ms
                          </span>
                          <span className="text-gray-400 dark:text-gray-500 text-[11px] w-20 text-right">
                            {relativeTime(req.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center rounded-b-xl">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Showing {requestsData.length} most recent recorded requests
              </span>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
