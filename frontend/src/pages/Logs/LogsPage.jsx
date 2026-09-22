import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { logApi } from '../../api/logApi';
import { useWebSocket } from '../../context/WebSocketContext';
import { subscribe } from '../../services/websocketService';
import toast from 'react-hot-toast';

export const LogsPage = () => {
  const { id: projectId } = useParams();
  const [logs,        setLogs]        = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading,     setLoading]     = useState(false);
  const { connected } = useWebSocket();
  const consoleEndRef  = useRef(null);
  const isInitialLoad  = useRef(true);

  // Auto-scroll only on new live logs, not on initial load
  useEffect(() => {
    if (isInitialLoad.current) { isInitialLoad.current = false; return; }
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const fetchRecentLogs = async () => {
      setLoading(true);
      try {
        const data = await logApi.search({ projectId, size: 50 });
        setLogs(Array.isArray(data) ? data : data?.content || []);
      } catch {
        toast.error('Failed to load logs');
      } finally {
        setLoading(false);
      }
    };
    fetchRecentLogs();
  }, [projectId]);

  useEffect(() => {
    if (!connected || !projectId) return;
    const unsub = subscribe(`/topic/logs/${projectId}`, (event) => {
      setLogs((prev) => [...prev, event]);
    });
    return () => unsub();
  }, [connected, projectId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await logApi.search({ projectId, query: searchQuery, size: 100 });
      setLogs(Array.isArray(data) ? data : data?.content || []);
    } catch {
      toast.error('Log search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Toolbar — flat, no card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Stream Logs</h2>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            connected
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search logs (e.g. GET, 500)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-1.5 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-25"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Terminal */}
      <div className="flex-1 bg-gray-950 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-y-auto flex flex-col gap-0.5" style={{ minHeight: '400px' }}>
        {loading && logs.length === 0 && (
          <div className="text-gray-500">Retrieving logs<span className="animate-pulse">...</span></div>
        )}
        {!loading && logs.length === 0 && (
          <div className="text-gray-600 italic">
            No logs in buffer. Trigger API requests or code executions to generate activity.
            <span className="ml-1 text-gray-500 animate-pulse">_</span>
          </div>
        )}
        {logs.map((log, index) => {
          const timestamp   = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
          const level       = log.level || (log.status >= 500 ? 'ERROR' : log.status >= 400 ? 'WARN' : 'INFO');
          const levelStyle  =
            level === 'ERROR' ? 'bg-red-950 text-red-400 border border-red-800/60' :
            level === 'WARN'  ? 'bg-yellow-950 text-yellow-400 border border-yellow-800/60' :
                                'bg-emerald-950 text-emerald-400 border border-emerald-800/60';
          const methodStyle =
            log.method === 'GET'    ? 'text-sky-400' :
            log.method === 'POST'   ? 'text-emerald-400' :
            log.method === 'PUT'    ? 'text-amber-400' :
            log.method === 'DELETE' ? 'text-red-400' : 'text-gray-400';
          const statusColor =
            log.status >= 500 ? 'text-red-400' :
            log.status >= 400 ? 'text-amber-400' :
            log.status >= 200 ? 'text-green-400' : 'text-gray-400';

          return (
            <div
              key={index}
              className="flex flex-col py-1.5 border-b border-gray-900/80 hover:bg-gray-900/50 transition-colors px-1 rounded"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-600 select-none tabular-nums">[{timestamp}]</span>
                <span className={`px-1.5 py-0.5 rounded text-2xs font-bold ${levelStyle}`}>{level}</span>
                {log.eventType && log.eventType !== 'HTTP' && (
                  <span className="px-1.5 py-0.5 rounded text-2xs bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold">
                    {log.eventType}
                  </span>
                )}
                {log.method && <span className={`font-bold ${methodStyle}`}>{log.method}</span>}
                <span className="text-gray-200 flex-1 truncate">{log.uri}</span>
                {log.status && (
                  <span className={`font-semibold tabular-nums ${statusColor}`}>{log.status}</span>
                )}
                {log.durationMs != null && (
                  <span className="text-blue-400 tabular-nums">{log.durationMs}ms</span>
                )}
              </div>
              {/* Context row */}
              {(log.traceId || log.clientIp || log.userId || log.errorMessage) && (
                <div className="flex flex-wrap gap-3 mt-0.5 pl-4 text-2xs text-gray-500">
                  {log.traceId    && <span><span className="text-gray-600">trace:</span> <span className="text-[var(--accent-text)]">{log.traceId}</span></span>}
                  {log.clientIp   && <span><span className="text-gray-600">ip:</span> {log.clientIp}</span>}
                  {log.userId     && <span className="truncate max-w-xs"><span className="text-gray-600">user:</span> {log.userId}</span>}
                  {log.errorMessage && (
                    <span className="text-rose-400 font-sans">
                      {log.errorMessage}{log.errorClass ? ` (${log.errorClass})` : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
};
