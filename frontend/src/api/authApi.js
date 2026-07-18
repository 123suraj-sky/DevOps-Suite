import apiClient from './client';

export const authApi = {
  login: async (data) => {
    const response = await apiClient.post('/auth/login', data);
    return response.data.data;
  },

  register: async (data) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data.data;
  },

  logout: async () => {
    await apiClient.post('/auth/logout');
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },
};
