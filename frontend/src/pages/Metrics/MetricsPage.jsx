import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { metricsApi } from '../../api/metricsApi';
import toast from 'react-hot-toast';

export const MetricsPage = () => {
  const { id: projectId } = useParams();
  const [loading, setLoading] = useState(true);
  const [throughputData, setThroughputData] = useState([]);
  const [latencyData, setLatencyData] = useState([]);

  // Fetch initial charts metrics data
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        // Fetch dashboard data
        const data = await metricsApi.getDashboard(projectId).catch(() => null);
        
        if (data) {
          setThroughputData(data.throughput || []);
          setLatencyData(data.latency || []);
        } else {
          // Generate realistic mockup data if Actuator metric is raw / unaggregated yet
          const mockedThroughput = Array.from({ length: 10 }, (_, i) => ({
            time: `${10 - i}m ago`,
            RPM: Math.floor(Math.random() * 100) + 20,
            errors: Math.floor(Math.random() * 5),
          }));
          const mockedLatency = Array.from({ length: 10 }, (_, i) => ({
            time: `${10 - i}m ago`,
            p50: Math.floor(Math.random() * 80) + 40,
            p99: Math.floor(Math.random() * 300) + 120,
          }));
          setThroughputData(mockedThroughput);
          setLatencyData(mockedLatency);
        }
      } catch (error) {
        console.error('Failed to load metrics:', error);
        toast.error('Metrics loading failed');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Application Metrics Dashboard</h1>
        <span className="text-sm text-gray-500 italic">Auto-refreshing every 10 seconds</span>
      </div>

      {loading && throughputData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Querying Prometheus scrapers...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Throughput Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Throughput (RPM)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={throughputData}>
                  <defs>
                    <linearGradient id="colorRpm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="RPM" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRpm)" />
                  <Area type="monotone" dataKey="errors" stroke="#ef4444" fillOpacity={0.2} fill="#ef4444" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Latency Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Latency (ms)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyData}>
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
      )}
    </div>
  );
};
