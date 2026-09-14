import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { metricsApi } from '../../api';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';

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
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  TIMEOUT: 'bg-orange-100 text-orange-800',
  OOM_KILLED: 'bg-orange-100 text-orange-800',
  RUNNING: 'bg-blue-100 text-blue-800',
  QUEUED: 'bg-gray-100 text-gray-700',
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
  const [dashboard, setDashboard] = useState(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Detailed view modal state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState('');
  const [requestsData, setRequestsData] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestQuery, setRequestQuery] = useState('');

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
    if (!isBackground) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await metricsApi.getDashboard('default', timeRange);
      setDashboard(data);
      setError('');
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => fetchDashboard(true), 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading && !dashboard) return <Spinner size="lg" className="mt-20" />;
  if (error && !dashboard) return <div className="text-center mt-20 text-red-500">{error}</div>;

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
      {/* Page Header with Time Range selector and auto-refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">Live platform operations & telemetry</span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-400">Auto-refreshing (10s)</span>
            {refreshing && (
              <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                <img src={syncIcon} alt="Syncing" className="w-3 h-3 animate-spin" />
                Updating...
              </span>
            )}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === range.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform-wide stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <img src={folderIcon} alt="Projects" className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Projects</p>
            <p className="text-2xl font-bold text-gray-900">{projectCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <img src={syncIcon} alt="In Progress" className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{taskSummary.inProgress ?? 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <img src={clockIcon} alt="Pending" className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending / Todo</p>
            <p className="text-2xl font-bold text-amber-600">{taskSummary.todo ?? 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <img src={checkIcon} alt="Completed" className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-green-600">{taskSummary.done ?? 0}</p>
          </div>
        </Card>
      </div>

      {/* Infrastructure Service Health Panel */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src={lightningIcon} alt="Health" className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-gray-900">Infrastructure Service Health</h2>
          </div>
          <span className="text-xs text-gray-400">Real-time Heartbeat & Ping</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {serviceHealth.map((svc) => {
            const isUp = svc.status === 'UP';
            return (
              <div
                key={svc.serviceName}
                className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/70 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{svc.serviceName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Latency: <span className="font-mono">{svc.responseTimeMs} ms</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <img
                    src={circleDotIcon}
                    alt={svc.status}
                    className={`w-3.5 h-3.5 ${isUp ? 'text-green-500' : 'text-red-500'}`}
                  />
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isUp
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {svc.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Live Telemetry Charts (Throughput & Latency) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Throughput Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Request Throughput (RPM)</h2>
              <span className="text-xs text-gray-400 font-mono">Window: {timeRange}</span>
            </div>
            <button
              onClick={() => openDetailsModal('Throughput & HTTP Traffic Details')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md border border-primary-200 transition-colors"
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
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="RPM" stroke="#4f46e5" fillOpacity={1} fill="url(#adminColorRpm)" />
                <Area type="monotone" dataKey="errors" stroke="#ef4444" fillOpacity={0.2} fill="#ef4444" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Request Latency (ms)</h2>
              <span className="text-xs text-gray-400 font-mono">Window: {timeRange}</span>
            </div>
            <button
              onClick={() => openDetailsModal('Request Latency & Response Time Details')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md border border-primary-200 transition-colors"
            >
              <img src={fullscreenIcon} alt="Details" className="w-3.5 h-3.5" />
              <span>Detailed View</span>
            </button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="p50" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="p99" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Operational Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/projects"
          className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-sm transition-all"
        >
          <img src={plusIcon} alt="Projects" className="w-5 h-5 text-primary-600" />
          <span className="text-xs font-semibold text-gray-800">Manage Projects</span>
        </Link>
        <Link
          to="/admin/users"
          className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-sm transition-all"
        >
          <img src={usersIcon} alt="Users" className="w-5 h-5 text-indigo-600" />
          <span className="text-xs font-semibold text-gray-800">User Activity</span>
        </Link>
        <Link
          to="/kibana"
          className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-sm transition-all"
        >
          <img src={kibanaIcon} alt="Kibana" className="w-5 h-5 text-pink-600" />
          <span className="text-xs font-semibold text-gray-800">Kibana Logs</span>
        </Link>
        <Link
          to="/grafana"
          className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-sm transition-all"
        >
          <img src={grafanaIcon} alt="Grafana" className="w-5 h-5 text-orange-600" />
          <span className="text-xs font-semibold text-gray-800">Grafana Dashboards</span>
        </Link>
      </div>

      {/* Platform Real-time Activity & Executions Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Code Executions across platform */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <img src={lightningIcon} alt="Runs" className="w-4 h-4 text-amber-500" />
              Recent Platform Executions
            </h2>
            <span className="text-xs text-gray-400">Sandbox runs</span>
          </div>
          {recentExecutions?.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {recentExecutions.map((exec) => (
                <li key={exec.executionId} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700 capitalize">
                      {exec.language}
                    </span>
                    <span className="text-xs text-gray-500">
                      {exec.executionTimeMs > 0 ? `${exec.executionTimeMs}ms` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[exec.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {exec.status}
                    </span>
                    <span className="text-xs text-gray-400 w-16 text-right">
                      {relativeTime(exec.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No recent code executions recorded.</p>
          )}
        </Card>

        {/* Platform Task Activity Stream */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <img src={checkIcon} alt="Activity" className="w-4 h-4 text-green-500" />
              Platform Task Activity
            </h2>
            <span className="text-xs text-gray-400">Cross-project events</span>
          </div>
          {recentActivity?.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {recentActivity.map((event, idx) => (
                <li key={idx} className="flex items-start space-x-3 py-2.5">
                  <span className="mt-1 shrink-0">
                    <img src={checkIcon} alt="Activity" className="w-3.5 h-3.5 text-green-500" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 font-medium truncate">{event.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{relativeTime(event.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No recent task activity recorded.</p>
          )}
        </Card>
      </div>

      {/* Detailed View Modal (Actual HTTP Requests & Response Times) */}
      {isDetailsOpen && (
        <div
          onClick={() => setIsDetailsOpen(false)}
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200 cursor-default"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{detailsTitle}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Live HTTP telemetry events recorded in Elasticsearch (method, endpoint, status, latency)
                </p>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <img src={closeIcon} alt="Close" className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Search Filter */}
            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              <form onSubmit={handleSearchRequests} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Filter by endpoint path, method, or status (e.g. /api/tasks, POST, 200)..."
                  value={requestQuery}
                  onChange={(e) => setRequestQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="submit"
                  disabled={requestsLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Filter
                </button>
              </form>

              {requestsLoading ? (
                <div className="py-16 flex justify-center">
                  <Spinner size="md" />
                </div>
              ) : requestsData.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">
                  No individual request logs found matching the query.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                  {requestsData.map((req, idx) => {
                    const statusCode = Number(req.status || 200);
                    const isSuccess = statusCode >= 200 && statusCode < 300;
                    const isRedirect = statusCode >= 300 && statusCode < 400;
                    const isClientErr = statusCode >= 400 && statusCode < 500;

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-100/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase shrink-0 ${
                              req.method === 'GET'
                                ? 'bg-blue-100 text-blue-800'
                                : req.method === 'POST'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.method === 'PUT'
                                ? 'bg-amber-100 text-amber-800'
                                : req.method === 'DELETE'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {req.method || 'GET'}
                          </span>

                          <span className="font-semibold text-gray-900 truncate" title={req.uri}>
                            {req.uri || '/'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          {/* Status Code */}
                          <span
                            className={`px-2 py-0.5 rounded font-semibold text-[11px] border ${
                              isSuccess
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : isRedirect
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : isClientErr
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                          >
                            {req.status || 200}
                          </span>

                          {/* Latency */}
                          <span className="text-gray-600 font-semibold w-16 text-right">
                            {req.durationMs ?? 0} ms
                          </span>

                          {/* Relative Time */}
                          <span className="text-gray-400 text-[11px] w-20 text-right">
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
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center rounded-b-xl">
              <span className="text-xs text-gray-500">
                Showing {requestsData.length} most recent recorded requests
              </span>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-300 transition-colors"
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

