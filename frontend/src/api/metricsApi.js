import apiClient from './client';

export const metricsApi = {
  getDashboard: async (projectId) => {
    const response = await apiClient.get('/metrics/dashboard', { params: { projectId } });
    return response.data.data;
  },

  getMetrics: async (projectId, metricName, startTime, endTime) => {
    const response = await apiClient.get('/metrics', {
      params: { projectId, metricName, startTime, endTime },
    });
    return response.data.data;
  },

  getAlertRules: async (projectId) => {
    const response = await apiClient.get('/metrics/alerts', { params: { projectId } });
    return response.data.data;
  },

  createAlertRule: async (data) => {
    const response = await apiClient.post('/metrics/alerts', data);
    return response.data.data;
  },

  deleteAlertRule: async (id) => {
    await apiClient.delete(`/metrics/alerts/${id}`);
  },

  getSystemMetrics: async () => {
    const response = await apiClient.get('/metrics/system');
    return response.data.data;
  },
};
