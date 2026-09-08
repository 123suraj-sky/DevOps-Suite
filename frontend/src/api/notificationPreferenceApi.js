import apiClient from './client';

export const notificationPreferenceApi = {
  /** Returns all preferences (one per notification type) for the current user. */
  getAll: async () => {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  },

  /**
   * Upserts a single preference.
   * @param {string} type  - e.g. 'TASK_ASSIGNED'
   * @param {{ in_app?: boolean, email?: boolean }} updates
   */
  update: async (type, updates) => {
    const response = await apiClient.put(`/notifications/preferences/${type}`, updates);
    return response.data;
  },
};
