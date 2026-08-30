# 03 — Page Reload Redirects User to Login Page

## Symptoms

- Whenever a logged-in user refreshed/reloaded any protected page in the application, they were immediately logged out and redirected back to /login.
- Tokens were present in localStorage (ccessToken, efreshToken), but the session failed to restore upon page reload.

---

## Root Cause

In AuthContext.jsx (rontend/src/context/AuthContext.jsx), an authentication initialization effect runs when the application loads:

`javascript
useEffect(() => {
  const initAuth = async () => {
    const token = AuthService.getToken();
    if (token) {
      try {
        const user = await AuthService.getCurrentUser();
        dispatch({ type: 'SET_USER', payload: user });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch {
        dispatch({ type: 'LOGOUT' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  initAuth();
}, []);
`

However, AuthService (rontend/src/services/authService.js) did not implement the getCurrentUser method, despite uthApi.getCurrentUser already being available in rontend/src/api/authApi.js.

Calling AuthService.getCurrentUser() threw a TypeError: AuthService.getCurrentUser is not a function. The catch block caught this error and executed:

`javascript
dispatch({ type: 'LOGOUT' });
`

This cleared the authenticated state, triggering the route guard redirect to /login.

---

## Fix Applied

Added the missing getCurrentUser method to AuthService (rontend/src/services/authService.js) to delegate to uthApi.getCurrentUser():

`javascript
// frontend/src/services/authService.js
export class AuthService {
  // ... login, register, logout, getToken ...

  static async getCurrentUser() {
    return await authApi.getCurrentUser();
  }

  static isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  }
}
`
