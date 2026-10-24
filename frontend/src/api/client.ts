import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const requestUrl = error.config?.url || '';

      // Avoid infinite redirects on public auth endpoints or login page
      const isAuthEndpoint = requestUrl.includes('/auth/me') || requestUrl.includes('/auth/login');
      if (currentPath !== '/login' && !isAuthEndpoint) {
        window.location.href = '/login';
      }
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject(new Error(message));
  }
);

export const client = apiClient;
export default apiClient;
