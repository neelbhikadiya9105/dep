import { create } from 'zustand';
import { apiPost } from '../api/axios.js';

const getStoredToken = () => localStorage.getItem('token');
const getStoredUser = () => {
  try {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

const useAuthStore = create((set, get) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  isAuthenticated: !!getStoredToken(),

  login: async (email, password) => {
    const data = await apiPost('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, isAuthenticated: true });
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  checkRole: (...roles) => {
    const { user } = get();
    return user && roles.includes(user.role);
  },
}));

export default useAuthStore;
