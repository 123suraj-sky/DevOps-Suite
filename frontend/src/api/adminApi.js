import apiClient from './client';

export const adminApi = {
  getAllUsers: async () => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },

  getUserTasks: async (userId) => {
    const response = await apiClient.get(`/admin/users/${userId}/tasks`);
    return response.data;
  },

  getUserLogs: async (userId, params) => {
    const response = await apiClient.get(`/admin/users/${userId}/logs`, { params });
    return response.data;
  },
};
