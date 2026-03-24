import { useNavigate } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import useAuthStore from '../store/authStore.js';
import '../styles/no-permission.css';

export default function NoPermission() {
  const navigate = useNavigate();
  const theme = useAuthStore((s) => s.theme);

  return (
    <div className={`no-permission-page ${theme === 'dark' ? 'is-dark' : ''}`}>
      <div className="no-permission-card">
        <div className="no-permission-icon-wrap">
          <FiLock className="no-permission-icon" size={36} />
        </div>
        <h1 className="no-permission-title">You don&apos;t have access to this feature</h1>
        <p className="no-permission-copy">
          This feature is not available on your current plan. Contact your store administrator to request access.
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary no-permission-action">
          Go Back
        </button>
      </div>
    </div>
  );
}
