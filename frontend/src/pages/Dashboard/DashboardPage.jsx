import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { metricsApi } from '../../api';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';

export const DashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await metricsApi.getDashboard('default');
        setDashboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <Spinner size="lg" className="mt-20" />;
  if (error) return <div className="text-center mt-20 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total Projects</p>
          <p className="text-2xl font-bold text-gray-900">{dashboard?.projectCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Open Tasks</p>
          <p className="text-2xl font-bold text-gray-900">{dashboard?.taskSummary.todo ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">{dashboard?.taskSummary.inProgress ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{dashboard?.taskSummary.done ?? 0}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboard?.serviceHealth.map((service) => (
            <div key={service.serviceName} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <p className="text-sm font-medium text-gray-900">{service.serviceName}</p>
                <p className="text-xs text-gray-500">Response: {service.responseTimeMs}ms</p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  service.status === 'UP'
                    ? 'bg-green-100 text-green-800'
                    : service.status === 'DOWN'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {service.status}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex space-x-4">
        <Link
          to="/projects"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
        >
          View Projects
        </Link>
        <Link
          to="/metrics"
          className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium"
        >
          View Metrics
        </Link>
      </div>
    </div>
  );
};
