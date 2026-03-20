import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiLogOut, FiSettings } from 'react-icons/fi';
import { RoleBadge } from '../ui/Badge.jsx';
import NotificationDropdown from '../NotificationDropdown.jsx';
import useAuthStore from '../../store/authStore.js';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/sales':     'Sales / POS',
  '/returns':   'Returns',
  '/reports':   'Reports',
  '/approvals': 'Approvals',
  '/stores':    'Stores',
  '/employees': 'Employee Management',
  '/user-approvals': 'User Approvals',
  '/audit-log': 'Audit Log',
  '/settings':  'Settings',
  '/superuser': 'Admin Panel',
};

export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Handle dynamic paths like /employees/:id
  const pathKey = Object.keys(PAGE_TITLES).find((k) =>
    location.pathname === k || location.pathname.startsWith(k + '/')
  );
  const title = PAGE_TITLES[pathKey] || 'Dashboard';

  const displayName = user?.displayName || user?.name || '';

  return (
    <header className="fixed top-0 left-[250px] right-0 h-[60px] bg-white border-b border-slate-100 flex items-center justify-between px-6 z-30">
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>

      <div className="flex items-center gap-3">
        {user && <RoleBadge role={user.role} />}
        <NotificationDropdown />
        <Link
          to="/settings"
          className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-all"
          title="Settings"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
            {user?.avatar || displayName[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">{displayName}</span>
        </Link>
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
