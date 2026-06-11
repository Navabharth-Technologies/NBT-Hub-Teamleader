/**
 * NBT Hub — Teamleader Module
 * Global Axios Instance & Security Interceptor
 *
 * Handles:
 *   - Attaching Authorization header to all requests
 *   - Detecting 401 session invalidation (token expired or global logout)
 *   - Prompting the user and redirecting to login on session loss
 */

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { BASE_URL } from './config';

// ─────────────────────────────────────────────
// 1. Create module-level axios instance
// ─────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically retry failed requests up to 3 times silently
axiosRetry(api, { 
  retries: 3, 
  retryDelay: (retryCount) => {
    return retryCount * 1000; // Wait 1s, then 2s, then 3s between retries
  },
  retryCondition: (error) => {
    // Retry if the server crashes (5xx errors) or network disconnects
    return error.response?.status >= 500 || !error.response;
  }
});

// ─────────────────────────────────────────────
// 2. Request Interceptor — Auto-attach token
// ─────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token.trim()}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────
// 3. Response Interceptor — Handle 401 / Global Logout
// ─────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isGlobalLogout = error.response?.data?.globalLogout === true;

      if (isGlobalLogout) {
        // Another device changed the password and triggered a global logout
        alert(
          '⚠️ Security Alert: Your password was changed on another device.\n' +
          'You have been signed out for your protection.'
        );
      }

      // Clear all session data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');

      // Redirect to login
      window.location.href = './';
    }

    return Promise.reject(error);
  }
);

export default api;
