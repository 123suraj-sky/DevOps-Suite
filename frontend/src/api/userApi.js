import apiClient from './client';

/**
 * Normalize snake_case user fields from the backend → camelCase for the frontend.
 * Mirrors the normalisation in authApi.js and also handles the new follow/view fields.
 */
const normalizeUser = (user) => {
  if (!user) return user;
  return {
    ...user,
    userId:           user.userId          ?? user.user_id          ?? null,
    displayName:      user.displayName     ?? user.display_name     ?? null,
    avatarUrl:        user.avatarUrl       ?? user.avatar_url       ?? null,
    createdAt:        user.createdAt       ?? user.created_at       ?? null,
    lastLoginAt:      user.lastLoginAt     ?? user.last_login_at    ?? null,
    followersCount:   user.followersCount  ?? user.followers_count  ?? 0,
    followingCount:   user.followingCount  ?? user.following_count  ?? 0,
    isFollowing:      user.isFollowing     ?? user.is_following     ?? null,
    profileViewCount: user.profileViewCount ?? user.profile_view_count ?? 0,
  };
};

export const userApi = {
  /**
   * GET /api/users/{id}
   * Fetches any user's public profile.
   * Increments the profile view count server-side for non-self visits.
   * Returns a normalised user object including followersCount, followingCount,
   * isFollowing (true/false/null), and profileViewCount.
   */
  getProfile: async (userId) => {
    const response = await apiClient.get(`/users/${userId}`);
    return normalizeUser(response.data.data);
  },

  /**
   * POST /api/users/{id}/follow
   * Follow the user with the given id.
   */
  follow: async (userId) => {
    const response = await apiClient.post(`/users/${userId}/follow`);
    return response.data;
  },

  /**
   * DELETE /api/users/{id}/follow
   * Unfollow the user with the given id.
   */
  unfollow: async (userId) => {
    const response = await apiClient.delete(`/users/${userId}/follow`);
    return response.data;
  },

  /**
   * GET /api/users/{id}/followers
   * Returns the list of users who follow {id}.
   */
  getFollowers: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/followers`);
    return (response.data.data ?? []).map(normalizeUser);
  },

  /**
   * GET /api/users/{id}/following
   * Returns the list of users that {id} follows.
   */
  getFollowing: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/following`);
    return (response.data.data ?? []).map(normalizeUser);
  },
};
