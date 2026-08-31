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
    const refreshToken = localStorage.getItem('refreshToken');
    await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },

  updateProfile: async (data) => {
    const response = await apiClient.put('/auth/me', data);
    return response.data.data;
  },
};
