import axios from 'axios';

const api = axios.create({
  baseURL: 'https://dep-ikfu.onrender.com/api',
  timeout: 15000,
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 and provide consistent error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    // Normalize timeout errors so callers can show a helpful message
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timed out. Please check your connection and try again.';
    } else if (!error.response) {
      error.message = 'Network error. Please check your connection and try again.';
    }
    return Promise.reject(error);
  }
);

export const apiGet = (url, params) => api.get(url, { params }).then((r) => r.data);
export const apiPost = (url, data) => api.post(url, data).then((r) => r.data);
export const apiPut = (url, data) => api.put(url, data).then((r) => r.data);
export const apiPatch = (url, data) => api.patch(url, data).then((r) => r.data);
export const apiDelete = (url) => api.delete(url).then((r) => r.data);

export default api;
