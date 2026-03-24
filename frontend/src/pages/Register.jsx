import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiEye, FiEyeOff, FiShield, FiUserPlus } from 'react-icons/fi';
import useAuthStore from '../store/authStore.js';
import Alert from '../components/ui/Alert.jsx';
import api from '../api/axios.js';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function Register() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [storeId, setStoreId] = useState('');
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    api.get('/stores/public')
      .then((res) => setStores(res.data || []))
      .catch(() => setStores([]))
      .finally(() => setStoresLoading(false));
  }, []);

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const getPasswordStrength = () => {
    if (!password) return null;
    const checks = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)];
    const passed = checks.filter(Boolean).length;
    if (passed <= 1) return { label: 'Weak', state: 'is-weak' };
    if (passed === 2) return { label: 'Fair', state: 'is-fair' };
    if (passed === 3) return { label: 'Good', state: 'is-good' };
    return { label: 'Strong', state: 'is-strong' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAlert();

    if (!storeId) return showAlert('Please select a store to register for.');
    if (!PASSWORD_REGEX.test(password)) {
      return showAlert('Password must be at least 8 characters with one uppercase letter, one number, and one special character.');
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, role, storeId);
      setRegistered(true);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  if (registered) {
    return (
      <div className="auth-page">
        <div className="auth-card is-centered">
          <div className="auth-brand is-success">
            <FiUserPlus size={28} />
          </div>
          <h2 className="auth-title">Registration Submitted!</h2>
          <p className="auth-subtitle">
            Your registration is pending approval by your store administrator. You&apos;ll be able to log in once approved.
          </p>
          <Link to="/login" className="btn btn-primary btn-block">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <FiShield size={28} />
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Register to request access</p>
        </div>

        {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="form-label">Full Name</label>
            <input type="text" className="form-control" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input type="email" className="form-control" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label className="form-label">Password</label>
            <div className="auth-password-row">
              <input
                type={showPw ? 'text' : 'password'}
                className="form-control has-icon"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button type="button" className="auth-password-toggle" onClick={() => setShowPw((value) => !value)}>
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {strength && <p className={`auth-strength ${strength.state}`}>Strength: {strength.label}</p>}
            <ul className="auth-checklist">
              <li className={password.length >= 8 ? 'is-complete' : ''}>At least 8 characters</li>
              <li className={/[A-Z]/.test(password) ? 'is-complete' : ''}>One uppercase letter</li>
              <li className={/\d/.test(password) ? 'is-complete' : ''}>One number</li>
              <li className={/[^A-Za-z0-9]/.test(password) ? 'is-complete' : ''}>One special character</li>
            </ul>
          </div>
          <div>
            <label className="form-label">Role</label>
            <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)} required>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div>
            <label className="form-label">Store *</label>
            {storesLoading ? (
              <div className="form-control">Loading stores...</div>
            ) : stores.length === 0 ? (
              <div className="form-control">No active stores available. Contact your administrator.</div>
            ) : (
              <select className="form-control" value={storeId} onChange={(e) => setStoreId(e.target.value)} required>
                <option value="">— Select a store —</option>
                {stores.map((store) => (
                  <option key={store._id} value={store._id}>{store.shopName || store.name}</option>
                ))}
              </select>
            )}
          </div>

          <button type="submit" disabled={loading || storesLoading || stores.length === 0} className="btn btn-primary btn-block">
            {loading ? <span className="loading-spinner size-sm inline-light" /> : <FiUserPlus size={16} />}
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
