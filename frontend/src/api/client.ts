import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? `${window.location.origin}/api`
    : 'http://localhost:5001/api');

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const setStoredRefreshToken = (token: string | null) => {
  if (token) {
    sessionStorage.setItem('edusecure_rt', token);
  } else {
    sessionStorage.removeItem('edusecure_rt');
  }
};

export const getStoredRefreshToken = () => sessionStorage.getItem('edusecure_rt');

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token to headers
api.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Silent token refresh interceptor on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/2fa') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const storedRt = getStoredRefreshToken();
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          storedRt ? { refreshToken: storedRt } : {},
          { withCredentials: true }
        );
        const newAccessToken = refreshResponse.data.accessToken;
        if (refreshResponse.data.refreshToken) {
          setStoredRefreshToken(refreshResponse.data.refreshToken);
        }
        setAccessToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        setAccessToken(null);
        setStoredRefreshToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
); 