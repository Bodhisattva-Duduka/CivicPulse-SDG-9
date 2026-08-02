import axios from 'axios';
import { getToken } from './auth';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired — clear it
      localStorage.removeItem('civicpulse_token');
      // Don't redirect automatically — let the component handle it
    }
    return Promise.reject(error);
  }
);

export default api;
