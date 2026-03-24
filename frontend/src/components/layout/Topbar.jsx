import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiLogOut } from 'react-icons/fi';
import { RoleBadge } from '../ui/Badge.jsx';
import NotificationDropdown from '../NotificationDropdown.jsx';
import useAuthStore from '../../store/authStore.js';

const PAGE_TITLES = {
  '/superuser': 'Superuser Admin Panel',
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/sales': 'Sales / POS',
  '/returns': 'Returns',
  '/reports': 'Reports',
  '/approvals': 'Approvals',
  '/stores': 'Stores',
  '/employees': 'Employee Management',
  '/user-approvals': 'User Approvals',
  '/audit-log': 'Audit Log',
};

export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pathKey = Object.keys(PAGE_TITLES).find((k) =>
    location.pathname === k || location.pathname.startsWith(k + '/')
  );
  const title = PAGE_TITLES[pathKey] || 'Dashboard';

  return (
    <header className="topbar">
      <div className="topbar-section">
        <button type="button" onClick={() => navigate(-1)} className="topbar-action">
          <FiArrowLeft size={15} />
          <span>Back</span>
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-section">
        {user && <RoleBadge role={user.role} />}
        <NotificationDropdown />
        <div className="topbar-user">
          <div className="topbar-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <span className="topbar-user-name">{user?.name}</span>
        </div>
        <button type="button" onClick={handleLogout} className="topbar-action is-danger">
          <FiLogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
