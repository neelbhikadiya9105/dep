import { create } from 'zustand';
import { apiPost, apiPut, apiGet } from '../api/axios.js';

const getStoredToken = () => localStorage.getItem('token');
const getStoredUser = () => {
  try {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};
const getStoredFeatureFlags = () => {
  try {
    const f = localStorage.getItem('featureFlags');
    return f ? JSON.parse(f) : null;
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
  featureFlags: getStoredFeatureFlags(),

  login: async (email, password) => {
    const data = await apiPost('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, isAuthenticated: true });

    // Fetch feature flags for this store (non-blocking)
    if (data.user?.storeId) {
      apiGet(`/superuser/feature-flags/${data.user.storeId}`)
        .then((res) => {
          const flags = res.data?.features || null;
          if (flags) {
            localStorage.setItem('featureFlags', JSON.stringify(flags));
            set({ featureFlags: flags });
          }
        })
        .catch(() => {});
    }

    return data;
  },

  register: async (name, email, password) => {
    const data = await apiPost('/auth/register', { name, email, password });
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('featureFlags');
    set({ token: null, user: null, isAuthenticated: false, featureFlags: null });
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

  /**
   * Check whether a feature is enabled for the current store.
   * Superusers always have access. Returns true if flags not yet loaded.
   */
  hasFeature: (featureName) => {
    const { user, featureFlags } = get();
    if (user?.role === 'superuser') return true;
    if (!featureFlags) return true; // optimistic: allow until flags load
    return featureFlags[featureName] === true;
  },

  changePassword: async (currentPassword, newPassword) => {
    const data = await apiPut('/auth/change-password', { currentPassword, newPassword });
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
