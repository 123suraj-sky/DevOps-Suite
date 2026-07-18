import apiClient from './client';

export const taskApi = {
  getById: async (id) => {
    const response = await apiClient.get(`/tasks/${id}`);
    return response.data.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/tasks', data);
    return response.data.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/tasks/${id}`, data);
    return response.data.data;
  },

  updateStatus: async (id, status) => {
    const response = await apiClient.patch(`/tasks/${id}/status`, { status });
    return response.data.data;
  },

  delete: async (id) => {
    await apiClient.delete(`/tasks/${id}`);
  },

  reorder: async (projectId, boardId, tasks) => {
    await apiClient.put(`/projects/${projectId}/boards/${boardId}/tasks/reorder`, { tasks });
  },
};
