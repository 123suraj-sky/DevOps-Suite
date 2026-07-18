import apiClient from './client';

export const codeExecutionApi = {
  execute: async (data) => {
    const response = await apiClient.post('/code-execution/run', data);
    return response.data.data;
  },

  getStatus: async (id) => {
    const response = await apiClient.get(`/code-execution/${id}`);
    return response.data.data;
  },

  getHistory: async (projectId, page = 0, size = 20) => {
    const response = await apiClient.get('/code-execution/history', {
      params: { projectId, page, size },
    });
    return response.data.data;
  },
};
