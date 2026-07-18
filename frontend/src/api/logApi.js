import apiClient from './client';

export const logApi = {
  search: async (params) => {
    const response = await apiClient.get('/logs/search', { params });
    return response.data.data;
  },

  getServices: async (projectId) => {
    const response = await apiClient.get('/logs/services', { params: { projectId } });
    return response.data.data;
  },
};
