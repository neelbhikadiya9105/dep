import { useState, useEffect } from 'react';
import { FiUser, FiSettings, FiLogOut, FiSave, FiMoon, FiSun, FiShoppingBag } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import { apiGet, apiPut } from '../api/axios.js';
import useAuthStore from '../store/authStore.js';
import '../css/settings.css';

const AVATARS = ['🧑', '👩', '👨', '🧔', '👩‍💼', '👨‍💼', '🧑‍💻', '👩‍💻', '👨‍💻', '🦸', '🧙', '🤵'];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user: authUser, logout, setAuth, theme, setTheme, shopBranding, setShopBranding } = useAuthStore();

  const [branding, setBranding] = useState({ shopName: '', logoUrl: '', address: '', phone: '', email: '', receiptFooter: '' });
  const [brandingSaving, setBrandingSaving] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    displayName: '',
    avatar: '',
    currency: 'INR',
    role: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet('/settings/profile');
        setProfile(data.data || data);
      } catch {
        // Fallback to auth store
        if (authUser) {
          setProfile({
            name: authUser.name || '',
            email: authUser.email || '',
            displayName: authUser.displayName || '',
            avatar: authUser.avatar || '',
            currency: authUser.currency || 'INR',
            role: authUser.role || '',
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [authUser]);

  useEffect(() => {
    if (shopBranding) {
      setBranding({
        shopName: shopBranding.shopName || '',
        logoUrl: shopBranding.logoUrl || '',
        address: shopBranding.address || '',
        phone: shopBranding.phone || '',
        email: shopBranding.email || '',
        receiptFooter: shopBranding.receiptFooter || '',
      });
    }
  }, [shopBranding]);

  const handleSaveBranding = async () => {
    if (!authUser?.storeId) return;
    setBrandingSaving(true);
    try {
      const res = await apiPut(`/stores/${authUser.storeId}/branding`, branding);
      const updated = res.data || res;
      showAlert('Shop branding saved.', 'success');
      if (setShopBranding) setShopBranding(updated);
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save branding.');
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiPut('/settings/profile', {
        displayName: profile.displayName,
        avatar: profile.avatar,
        currency: profile.currency,
      });
      showAlert('Settings saved successfully.', 'success');
      // Update auth store so topbar/sidebar reflect changes
      if (authUser) {
        const updatedUser = { ...authUser, displayName: profile.displayName, avatar: profile.avatar, currency: profile.currency };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setAuth(localStorage.getItem('token'), updatedUser);
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayedName = profile.displayName || profile.name || authUser?.name || 'U';

  return (
    <DashboardLayout>
      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      <div className="settings-page">
        {/* ── Profile Settings ── */}
        <div className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon"><FiUser size={16} /></div>
            <div className="settings-section__title">Profile Settings</div>
          </div>
          <div className="settings-section__body">
            {/* Avatar preview */}
            <div className="settings-avatar-preview">
              {profile.avatar || displayedName[0]?.toUpperCase() || 'U'}
            </div>

            {/* Avatar selector */}
            <div className="settings-form-row">
              <label>Choose Avatar</label>
              <div className="settings-avatar-grid">
                {AVATARS.map((av) => (
                  <div
                    key={av}
                    className={`settings-avatar-option ${profile.avatar === av ? 'settings-avatar-option--selected' : ''}`}
                    onClick={() => setProfile({ ...profile, avatar: av })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setProfile({ ...profile, avatar: av })}
                  >
                    {av}
                  </div>
                ))}
                {/* Clear avatar option */}
                <div
                  className={`settings-avatar-option ${profile.avatar === '' ? 'settings-avatar-option--selected' : ''}`}
                  onClick={() => setProfile({ ...profile, avatar: '' })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setProfile({ ...profile, avatar: '' })}
                  title="Use initials"
                >
                  A
                </div>
              </div>
            </div>

            <div className="settings-form-row">
              <label>Display Name</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder="How your name appears in the app"
                maxLength={40}
              />
              <div className="settings-form-row__hint">Leave blank to use your account name.</div>
            </div>

            <div className="settings-form-row">
              <label>Full Name</label>
              <input type="text" value={profile.name} readOnly />
            </div>

            <div className="settings-form-row">
              <label>Email Address</label>
              <input type="email" value={profile.email} readOnly />
              <div className="settings-form-row__hint">Email cannot be changed here.</div>
            </div>

            <div className="settings-form-row">
              <label>Role</label>
              <input type="text" value={profile.role} readOnly style={{ textTransform: 'capitalize' }} />
            </div>

            <div className="settings-actions">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
                <FiSave size={14} />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              <button className="settings-danger-btn" onClick={handleLogout}>
                <FiLogOut size={14} />
                Log Out
              </button>
            </div>
          </div>
        </div>


        {/* ── Shop Branding (owner only) ── */}
        {authUser?.role === 'owner' && (
          <div className="settings-section">
            <div className="settings-section__header">
              <div className="settings-section__icon"><FiShoppingBag size={16} /></div>
              <div className="settings-section__title">Shop Branding</div>
            </div>
            <div className="settings-section__body">
              <div className="settings-form-row">
                <label>Shop Name</label>
                <input type="text" value={branding.shopName} onChange={(e) => setBranding({ ...branding, shopName: e.target.value })} placeholder="Your shop name" maxLength={80} />
                <div className="settings-form-row__hint">Appears in the topbar and sidebar header.</div>
              </div>
              <div className="settings-form-row">
                <label>Logo URL (optional)</label>
                <input type="url" value={branding.logoUrl} onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })} placeholder="https://..." />
                <div className="settings-form-row__hint">Public image URL for your shop logo.</div>
              </div>
              <div className="settings-form-row">
                <label>Address</label>
                <input type="text" value={branding.address} onChange={(e) => setBranding({ ...branding, address: e.target.value })} placeholder="123 Main Street, City" />
              </div>
              <div className="settings-form-row">
                <label>Phone</label>
                <input type="text" value={branding.phone} onChange={(e) => setBranding({ ...branding, phone: e.target.value })} placeholder="+91 99999 99999" />
              </div>
              <div className="settings-form-row">
                <label>Email</label>
                <input type="email" value={branding.email} onChange={(e) => setBranding({ ...branding, email: e.target.value })} placeholder="shop@example.com" />
              </div>
              <div className="settings-form-row">
                <label>Receipt Footer Message</label>
                <textarea value={branding.receiptFooter} onChange={(e) => setBranding({ ...branding, receiptFooter: e.target.value })} placeholder="Thank you for shopping with us!" rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div className="settings-actions">
                <button className="btn btn-primary" onClick={handleSaveBranding} disabled={brandingSaving || loading}>
                  <FiSave size={14} />
                  {brandingSaving ? 'Saving...' : 'Save Branding'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── System Preferences ── */}
        <div className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon"><FiSettings size={16} /></div>
            <div className="settings-section__title">System Preferences</div>
          </div>
          <div className="settings-section__body">
            <div className="settings-form-row">
              <label>Currency</label>
              <div className="settings-currency-grid">
                {CURRENCIES.map((c) => (
                  <div
                    key={c.code}
                    className={`settings-currency-option ${profile.currency === c.code ? 'settings-currency-option--selected' : ''}`}
                    onClick={() => setProfile({ ...profile, currency: c.code })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setProfile({ ...profile, currency: c.code })}
                    title={c.label}
                  >
                    <span className="settings-currency-option__symbol">{c.symbol}</span>
                    <span className="settings-currency-option__code">{c.code}</span>
                  </div>
                ))}
              </div>
              <div className="settings-form-row__hint">
                Currency symbol will be applied across Dashboard, POS, Reports, and Returns.
              </div>
            </div>

            <div className="settings-form-row">
              <label>Dark Mode</label>
              <div className="settings-theme-row">
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === 'dark'}
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`settings-theme-switch ${theme === 'dark' ? 'is-dark' : ''}`}
                >
                  <span
                    className={`settings-theme-thumb ${theme === 'dark' ? 'is-dark' : ''}`}
                  />
                </button>
                <span className="settings-theme-label">
                  {theme === 'dark' ? <><FiMoon size={14} /> Dark Mode On</> : <><FiSun size={14} /> Light Mode</>}
                </span>
              </div>
              <div className="settings-form-row__hint">Theme is saved and applies across all pages.</div>
            </div>

            <div className="settings-actions">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
                <FiSave size={14} />
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
