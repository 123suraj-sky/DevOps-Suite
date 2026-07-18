import apiClient from './client';

export const projectApi = {
  getAll: async (page = 0, size = 10) => {
    const response = await apiClient.get('/projects', { params: { page, size } });
    return response.data.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/projects', data);
    return response.data.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/projects/${id}`, data);
    return response.data.data;
  },

  delete: async (id) => {
    await apiClient.delete(`/projects/${id}`);
  },

  addMember: async (projectId, userId, role) => {
    await apiClient.post(`/projects/${projectId}/members`, { userId, role });
  },

  removeMember: async (projectId, userId) => {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`);
  },

  getBoards: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/boards`);
    return response.data.data;
  },

  getTasks: async (projectId, params) => {
    const response = await apiClient.get(`/projects/${projectId}/tasks`, { params });
    return response.data.data;
  },
};
