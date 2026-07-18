import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { AuthService } from '../services';

const AuthContext = createContext(undefined);

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case 'LOGOUT':
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: AuthService.getToken(),
  isAuthenticated: AuthService.isAuthenticated(),
  loading: true,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = useCallback(async (email, password) => {
    const { user, token } = await AuthService.login({ email, password });
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
  }, []);

  const register = useCallback(async (data) => {
    const { user, token } = await AuthService.register(data);
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
  }, []);

  const logout = useCallback(async () => {
    await AuthService.logout();
    dispatch({ type: 'LOGOUT' });
  }, []);

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

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
