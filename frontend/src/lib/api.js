import axios from 'axios';
import { store } from '../store/store.js';
import { logoutSuccess } from '../store/slices/authSlice.js';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true, // sends httpOnly session cookie ('sid')
});

// ─── Response interceptor: on session expiry / 401, reset client auth state ───
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logoutSuccess());
    }
    return Promise.reject(error);
  }
);

