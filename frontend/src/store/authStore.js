import { create } from 'zustand';
import { apiPost, apiPut } from '../api/axios.js';

const getStoredToken = () => localStorage.getItem('token');
const getStoredUser = () => {
  try {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

const getStoredTheme = () => localStorage.getItem('theme') || 'light';

const useAuthStore = create((set, get) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  isAuthenticated: !!getStoredToken(),
  theme: getStoredTheme(),

  login: async (email, password) => {
    const data = await apiPost('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, isAuthenticated: true });
    return data;
  },

  register: async (name, email, password) => {
    const data = await apiPost('/auth/register', { name, email, password });
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

  changePassword: async (currentPassword, newPassword) => {
    const data = await apiPut('/auth/change-password', { currentPassword, newPassword });
    // Clear mustChangePassword flag in stored user
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, mustChangePassword: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
    return data;
  },

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
}));

export default useAuthStore;
