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
const getStoredShopBranding = () => {
  try {
    const b = localStorage.getItem('shopBranding');
    return b ? JSON.parse(b) : null;
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
  shopBranding: getStoredShopBranding(),
  // true once feature flags have been fetched (or confirmed absent) for the current session.
  // On page reload we won't re-fetch flags, so treat any existing session as initialized.
  featureFlagsLoaded: !!getStoredToken(),

  login: async (email, password) => {
    const data = await apiPost('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, isAuthenticated: true });

    // Fetch feature flags and shop branding for this store (non-blocking)
    if (data.user?.storeId) {
      apiGet(`/superuser/feature-flags/${data.user.storeId}`)
        .then((res) => {
          const flags = res.data?.features || null;
          localStorage.setItem('featureFlags', JSON.stringify(flags));
          set({ featureFlags: flags, featureFlagsLoaded: true });
        })
        .catch(() => {
          // Could not load flags — mark as loaded with no flags; routes will deny access properly
          set({ featureFlagsLoaded: true });
        });

      // Fetch shop branding
      apiGet('/stores')
        .then((stores) => {
          const arr = Array.isArray(stores) ? stores : (stores.data || []);
          const store = arr.find((s) => String(s._id) === String(data.user.storeId)) || arr[0] || null;
          if (store) {
            localStorage.setItem('shopBranding', JSON.stringify(store));
            set({ shopBranding: store });
          }
        })
        .catch(() => {});
    } else {
      set({ featureFlagsLoaded: true });
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
    localStorage.removeItem('shopBranding');
    set({ token: null, user: null, isAuthenticated: false, featureFlags: null, featureFlagsLoaded: false, shopBranding: null });
  },

  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  setShopBranding: (branding) => {
    localStorage.setItem('shopBranding', JSON.stringify(branding));
    set({ shopBranding: branding });
  },

  checkRole: (...roles) => {
    const { user } = get();
    return user && roles.includes(user.role);
  },

  /**
   * Check whether a feature is enabled for the current store.
   * Superusers always have access.
   * Returns false while flags are still loading to prevent premature access;
   * returns true once loaded and the feature is explicitly enabled.
   */
  hasFeature: (featureName) => {
    const { user, featureFlags, featureFlagsLoaded } = get();
    if (user?.role === 'superuser') return true;
    if (!featureFlagsLoaded) return false; // deny until flags are confirmed
    if (!featureFlags) return true; // no flags document: store pre-dates feature flags, allow all
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
