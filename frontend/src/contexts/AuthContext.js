import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// Initial state
const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  sessionToken: null,
  loading: true,
  isAuthenticated: false,
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REFRESH_START: 'REFRESH_START',
  REFRESH_SUCCESS: 'REFRESH_SUCCESS',
  REFRESH_FAILURE: 'REFRESH_FAILURE',
  SET_USER: 'SET_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        sessionToken: action.payload.sessionToken,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        sessionToken: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        sessionToken: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };

    case AUTH_ACTIONS.REFRESH_START:
      return {
        ...state,
        loading: true,
      };

    case AUTH_ACTIONS.REFRESH_SUCCESS:
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        sessionToken: action.payload.sessionToken,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case AUTH_ACTIONS.REFRESH_FAILURE:
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        sessionToken: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set up axios interceptors
  useEffect(() => {
    // Request interceptor - add auth token
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        const token = state.accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle token refresh
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            const sessionToken = localStorage.getItem('sessionToken');
            if (refreshToken && sessionToken) {
              const response = await axios.post(
                `${api.defaults.baseURL}/auth/refresh`,
                { refreshToken, sessionToken }
              );

              const { accessToken, refreshToken: newRefreshToken, sessionToken: newSessionToken, user } = response.data;

              dispatch({
                type: AUTH_ACTIONS.REFRESH_SUCCESS,
                payload: {
                  accessToken,
                  refreshToken: newRefreshToken,
                  sessionToken: newSessionToken,
                  user,
                },
              });

              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              localStorage.setItem('sessionToken', newSessionToken);

              // Retry the original request
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('user');
            toast.error('Session expired. Please login again.');
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [state.accessToken]);

  // Decode JWT payload without a library (base64url decode)
  const decodeToken = (token) => {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded;
    } catch {
      return null;
    }
  };

  // Initialize auth state from localStorage — no network call, instant load
  useEffect(() => {
    const initializeAuth = () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const sessionToken = localStorage.getItem('sessionToken');
      const userRaw = localStorage.getItem('user');

      const clearAndLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('user');
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      };

      if (accessToken && refreshToken && sessionToken && userRaw) {
        const decoded = decodeToken(accessToken);
        const now = Math.floor(Date.now() / 1000);

        if (!decoded) {
          clearAndLogout();
          return;
        }

        if (decoded.exp && decoded.exp > now) {
          // Token still valid — restore session immediately without a network round-trip
          try {
            const user = JSON.parse(userRaw);
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: { user, accessToken, refreshToken, sessionToken },
            });
          } catch {
            clearAndLogout();
          }
        } else {
          // Token expired — try to refresh in the background
          axios
            .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken, sessionToken })
            .then((res) => {
              const {
                accessToken: newAccess,
                refreshToken: newRefresh,
                sessionToken: newSession,
                user,
              } = res.data;
              localStorage.setItem('accessToken', newAccess);
              localStorage.setItem('refreshToken', newRefresh);
              localStorage.setItem('sessionToken', newSession);
              localStorage.setItem('user', JSON.stringify(user));
              dispatch({
                type: AUTH_ACTIONS.REFRESH_SUCCESS,
                payload: {
                  accessToken: newAccess,
                  refreshToken: newRefresh,
                  sessionToken: newSession,
                  user,
                },
              });
            })
            .catch(() => clearAndLogout());
        }
      } else {
        // No tokens — go straight to login, loading: false
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      const response = await api.post('/auth/login', credentials);
      const { user, accessToken, refreshToken, sessionToken } = response.data;

      // Store in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('sessionToken', sessionToken);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, accessToken, refreshToken, sessionToken },
      });

      toast.success(`Welcome back, ${user.full_name}!`);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error
        || (error.code === 'ERR_NETWORK' ? 'Cannot connect to server. Please ensure backend is running on port 5000.' : 'Login failed');
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout', {
        userId: state.user?.id,
        sessionToken: state.sessionToken || localStorage.getItem('sessionToken'),
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    }

    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');

    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    toast.success('Logged out successfully');
  };

  // Change password function
  const changePassword = async (passwordData) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword || passwordData.current_password,
        newPassword: passwordData.newPassword || passwordData.new_password,
      });

      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password change failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put(`/users/${state.user.id}`, profileData);
      const updatedUser = response.data.user;

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));

      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: updatedUser,
      });

      toast.success('Profile updated successfully');
      return { success: true, user: updatedUser };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    login,
    logout,
    changePassword,
    updateProfile,
    clearError,
    api, // Export the configured axios instance
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
