import { useNavigate } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import useAuthStore from '../store/authStore.js';

export default function NoPermission({ feature }) {
  const navigate = useNavigate();
  const theme = useAuthStore((s) => s.theme);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="text-center max-w-md">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${theme === 'dark' ? 'bg-slate-700' : 'bg-amber-100'}`}>
          <FiLock className={theme === 'dark' ? 'text-amber-400' : 'text-amber-500'} size={36} />
        </div>
        <h1 className={`text-2xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
          You don&apos;t have access to this feature
        </h1>
        <p className={`mb-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          This feature is not available on your current plan. Contact your store administrator to request access.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-primary justify-center"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
