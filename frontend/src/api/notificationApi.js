import apiClient from './client';

export const notificationApi = {
  getAll: async (page = 0, size = 20) => {
    const response = await apiClient.get('/notifications', { params: { page, size } });
    return response.data.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data.data;
  },

  markAsRead: async (id) => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    await apiClient.patch('/notifications/read-all');
  },
};
