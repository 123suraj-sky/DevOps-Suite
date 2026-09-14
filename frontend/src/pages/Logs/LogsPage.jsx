import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { logApi } from '../../api/logApi';
import { useWebSocket } from '../../context/WebSocketContext';
import { subscribe } from '../../services/websocketService';
import toast from 'react-hot-toast';

export const LogsPage = () => {
  const { id: projectId } = useParams();
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { connected } = useWebSocket();
  const consoleEndRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Auto-scroll logs panel only when a new live log arrives, not on initial load
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Load initial/recent logs
  useEffect(() => {
    const fetchRecentLogs = async () => {
      setLoading(true);
      try {
        const data = await logApi.search({ projectId, size: 50 });
        // Assume logApi returns a list of log entries under logs or direct array
        setLogs(Array.isArray(data) ? data : data?.content || []);
      } catch (error) {
        console.error('Failed to fetch recent logs:', error);
        toast.error('Failed to load historic logs');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentLogs();
  }, [projectId]);

  // Subscribe to real-time logs
  useEffect(() => {
    if (connected && projectId) {
      const unsubscribe = subscribe(`/topic/logs/${projectId}`, (logEvent) => {
        setLogs((prevLogs) => [...prevLogs, logEvent]);
      });
      return () => {
        unsubscribe();
      };
    }
  }, [connected, projectId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await logApi.search({ projectId, query: searchQuery, size: 100 });
      setLogs(Array.isArray(data) ? data : data?.content || []);
    } catch (error) {
      console.error('Logs search failed:', error);
      toast.error('Logs search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] space-y-4">
      {/* Control bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-gray-900">Project Stream Logs</h2>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {connected ? 'Live Streaming' : 'Offline'}
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search logs (e.g. GET, 500)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Logs Terminal */}
      <div className="flex-1 bg-gray-950 text-gray-100 p-4 rounded-lg shadow-inner font-mono text-xs overflow-y-auto flex flex-col space-y-1">
        {loading && logs.length === 0 && <div className="text-gray-500">Retrieving system logs...</div>}
        {!loading && logs.length === 0 && (
          <div className="text-gray-500 italic">No logs found. Trigger some API requests or execution jobs to view activity.</div>
        )}
        {logs.map((log, index) => {
          const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
          const isError = log.status >= 400 || log.level === 'ERROR';
          const level = log.level || (log.status >= 500 ? 'ERROR' : log.status >= 400 ? 'WARN' : 'INFO');
          const levelBadgeClass = level === 'ERROR'
            ? 'bg-red-950 text-red-400 border border-red-800'
            : level === 'WARN'
            ? 'bg-yellow-950 text-yellow-400 border border-yellow-800'
            : 'bg-emerald-950 text-emerald-400 border border-emerald-800';

          return (
            <div key={index} className="hover:bg-gray-900/80 p-1.5 rounded flex flex-col space-y-1 transition-colors border-b border-gray-900">
              <div className="flex items-center space-x-2">
                <span className="text-gray-500 select-none">[{timestamp}]</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${levelBadgeClass}`}>
                  {level}
                </span>
                {log.eventType && log.eventType !== 'HTTP' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                    {log.eventType}
                  </span>
                )}
                <span className={`font-bold ${isError ? 'text-red-400' : 'text-green-400'}`}>{log.method}</span>
                <span className="text-gray-200 flex-1 truncate">{log.uri}</span>
                <span className={`px-1.5 py-0.2 rounded font-semibold ${
                  log.status >= 500 ? 'bg-red-900 text-red-200' : log.status >= 400 ? 'bg-yellow-900 text-yellow-200' : 'bg-green-900 text-green-200'
                }`}>{log.status}</span>
                <span className="text-blue-400 font-semibold">{log.durationMs}ms</span>
              </div>

              {/* Context row: traceId, clientIp, user, error message */}
              <div className="flex items-center space-x-3 text-[11px] text-gray-400 pl-4">
                {log.traceId && (
                  <span className="text-indigo-400 font-mono">
                    <span className="text-gray-500">trace:</span> {log.traceId}
                  </span>
                )}
                {log.clientIp && (
                  <span className="text-gray-400">
                    <span className="text-gray-500">ip:</span> {log.clientIp}
                  </span>
                )}
                {log.userId && (
                  <span className="text-gray-400 truncate max-w-xs">
                    <span className="text-gray-500">user:</span> {log.userId}
                  </span>
                )}
                {log.errorMessage && (
                  <span className="text-rose-400 truncate flex-1 font-sans font-medium">
                    ⚠ {log.errorMessage} {log.errorClass ? `(${log.errorClass})` : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
};
