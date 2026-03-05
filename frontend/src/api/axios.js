import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiGet = (url, params) => api.get(url, { params }).then((r) => r.data);
export const apiPost = (url, data) => api.post(url, data).then((r) => r.data);
export const apiPut = (url, data) => api.put(url, data).then((r) => r.data);
export const apiDelete = (url) => api.delete(url).then((r) => r.data);

export default api;
