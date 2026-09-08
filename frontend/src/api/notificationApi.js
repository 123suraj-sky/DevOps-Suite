import apiClient from './client';

export const notificationApi = {
  // Returns a Spring Page object: { content: [...], totalElements, totalPages, ... }
  getAll: async (page = 0, size = 20) => {
    const response = await apiClient.get('/notifications', { params: { page, size } });
    return response.data;
  },

  // Backend returns { count: N } directly (no wrapper)
  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data.count;
  },

  // Backend controller maps PUT, not PATCH
  markAsRead: async (id) => {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  },

  // Backend controller maps PUT, not PATCH
  markAllAsRead: async () => {
    await apiClient.put('/notifications/read-all');
  },

  deleteNotification: async (id) => {
    await apiClient.delete(`/notifications/${id}`);
  },
};
