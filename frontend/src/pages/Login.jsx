import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiShield, FiDatabase, FiLogIn } from 'react-icons/fi';
import useAuthStore from '../store/authStore.js';
import { apiGet, apiPost } from '../api/axios.js';
import Alert from '../components/ui/Alert.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [alert, setAlert] = useState(null); // { message, type }

  // Already logged in → redirect
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAlert();
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      showAlert(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!email) return showAlert('Enter your email first', 'warning');
    try {
      const data = await apiPost('/auth/forgot', { email });
      showAlert(data.message, 'success');
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await apiGet('/auth/seed');
      showAlert('Demo users created! You can now log in.', 'success');
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiShield className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory Avengers</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {alert && (
          <Alert message={alert.message} type={alert.type} onClose={clearAlert} />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="owner@demo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="form-control pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={handleForgot}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center py-3"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FiLogIn size={16} />
            )}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-2">Demo Credentials</p>
          <div className="text-xs text-slate-600 space-y-1">
            <div><strong>Owner:</strong> owner@demo.com / password123</div>
            <div><strong>Manager:</strong> manager@demo.com / password123</div>
            <div><strong>Staff:</strong> staff@demo.com / password123</div>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="btn btn-secondary btn-sm w-full justify-center mt-3"
          >
            {seeding ? (
              <span className="w-3 h-3 border border-slate-400 border-t-slate-700 rounded-full animate-spin" />
            ) : (
              <FiDatabase size={13} />
            )}
            {seeding ? 'Seeding...' : 'Initialize Demo Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
