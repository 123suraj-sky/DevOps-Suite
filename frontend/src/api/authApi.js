import apiClient from './client';

// Normalize snake_case user fields from backend → camelCase for frontend
const normalizeUser = (user) => {
  if (!user) return user;
  return {
    ...user,
    displayName: user.displayName ?? user.display_name ?? null,
    avatarUrl: user.avatarUrl ?? user.avatar_url ?? null,
    createdAt: user.createdAt ?? user.created_at ?? null,
    lastLoginAt: user.lastLoginAt ?? user.last_login_at ?? null,
    gender: user.gender ?? null,
  };
};

export const authApi = {
  login: async (data) => {
    const response = await apiClient.post('/auth/login', data);
    const payload = response.data.data;
    return { ...payload, user: normalizeUser(payload?.user) };
  },

  register: async (data) => {
    const response = await apiClient.post('/auth/register', data);
    const payload = response.data.data;
    return { ...payload, user: normalizeUser(payload?.user) };
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
    return normalizeUser(response.data.data);
  },

  updateProfile: async (data) => {
    const response = await apiClient.put('/auth/me', data);
    return normalizeUser(response.data.data);
  },
};
