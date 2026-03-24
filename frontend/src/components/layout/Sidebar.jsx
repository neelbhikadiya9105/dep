import { NavLink } from 'react-router-dom';
import {
  FiGrid, FiPackage, FiShoppingCart, FiRotateCcw,
  FiBarChart2, FiCheckSquare, FiShield, FiMapPin,
  FiUsers, FiUserCheck, FiActivity,
} from 'react-icons/fi';
import useAuthStore from '../../store/authStore.js';

const NAV_ITEMS = [
  { to: '/superuser', icon: FiShield, label: 'Admin Panel', roles: ['superuser'] },
  { to: '/dashboard', icon: FiGrid, label: 'Dashboard' },
  { to: '/inventory', icon: FiPackage, label: 'Inventory' },
  { to: '/sales', icon: FiShoppingCart, label: 'Sales / POS' },
  { to: '/returns', icon: FiRotateCcw, label: 'Returns' },
  { to: '/reports', icon: FiBarChart2, label: 'Reports', roles: ['owner', 'manager'] },
  { to: '/approvals', icon: FiCheckSquare, label: 'Approvals' },
  { to: '/stores', icon: FiMapPin, label: 'Stores', roles: ['owner', 'manager'] },
  { to: '/audit-log', icon: FiActivity, label: 'Audit Log', roles: ['owner'] },
  { to: '/employees', icon: FiUsers, label: 'Employees', roles: ['owner', 'manager'] },
  { to: '/user-approvals', icon: FiUserCheck, label: 'User Approvals', roles: ['owner', 'manager'] },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!user) return false;
    if (user.role === 'superuser') {
      return item.roles?.includes('superuser');
    }
    return !item.roles || item.roles.includes(user.role);
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <FiShield size={18} />
        </div>
        <div>
          <div className="sidebar-brand-title">Inventory</div>
          <div className="sidebar-brand-subtitle">Avengers</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-list">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">StockPilot v2.0</div>
      </div>
    </aside>
  );
}
