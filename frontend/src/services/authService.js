import { authApi } from '../api';

export class AuthService {
  static async login(data) {
    const response = await authApi.login(data);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    return { user: response.user, token: response.accessToken };
  }

  static async register(data) {
    const response = await authApi.register(data);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    return { user: response.user, token: response.accessToken };
  }

  static async logout() {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  static getToken() {
    return localStorage.getItem('accessToken');
  }

  static isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  }
}
