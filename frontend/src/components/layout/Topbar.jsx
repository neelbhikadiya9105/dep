import { useNavigate, useLocation } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { RoleBadge } from '../ui/Badge.jsx';
import useAuthStore from '../../store/authStore.js';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/sales':     'Sales / POS',
  '/returns':   'Returns',
  '/reports':   'Reports',
  '/approvals': 'Approvals',
};

export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const title = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <header className="fixed top-0 left-[250px] right-0 h-[60px] bg-white border-b border-slate-100 flex items-center justify-between px-6 z-30">
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>

      <div className="flex items-center gap-3">
        {user && <RoleBadge role={user.role} />}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <FiLogOut size={15} />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </header>
  );
}
