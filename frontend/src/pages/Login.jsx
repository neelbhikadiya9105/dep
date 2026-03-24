import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { FiEye, FiEyeOff, FiShield, FiLogIn } from 'react-icons/fi';
import useAuthStore from '../store/authStore.js';
import Alert from '../components/ui/Alert.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAlert();
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      navigate(data.user?.role === 'superuser' ? '/superuser' : '/dashboard', { replace: true });
    } catch (err) {
      showAlert(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <FiShield size={28} />
          </div>
          <h1 className="auth-title">Inventory Avengers</h1>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <div className="auth-password-row">
              <input
                type={showPw ? 'text' : 'password'}
                className="form-control has-icon"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="button" className="auth-password-toggle" onClick={() => setShowPw((value) => !value)}>
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? <span className="loading-spinner size-sm inline-light" /> : <FiLogIn size={16} />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/register" className="auth-link">Register</Link>
        </p>
      </div>
    </div>
  );
}

