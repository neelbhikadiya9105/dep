import { NavLink } from 'react-router-dom';
import {
  FiGrid, FiPackage, FiShoppingCart, FiRotateCcw,
  FiBarChart2, FiCheckSquare, FiShield, FiMapPin,
  FiUsers, FiUserCheck, FiActivity, FiStar,
} from 'react-icons/fi';
import useAuthStore from '../../store/authStore.js';

const NAV_ITEMS = [
  { to: '/dashboard', icon: FiGrid,        label: 'Dashboard' },
  { to: '/inventory', icon: FiPackage,     label: 'Inventory' },
  { to: '/sales',     icon: FiShoppingCart,label: 'Sales / POS' },
  { to: '/returns',   icon: FiRotateCcw,   label: 'Returns' },
  { to: '/reports',   icon: FiBarChart2,   label: 'Reports', roles: ['owner', 'manager', 'superuser'] },
  { to: '/approvals', icon: FiCheckSquare, label: 'Approvals' },
  // Owner + Manager
  { to: '/employees',      icon: FiUsers,     label: 'Employees',      roles: ['owner', 'manager'] },
  { to: '/user-approvals', icon: FiUserCheck, label: 'User Approvals', roles: ['owner', 'manager'] },
  // Owner-specific
  { to: '/audit-log',    icon: FiActivity,  label: 'Audit Log',      roles: ['owner'] },
  // Superuser only
  { to: '/superuser',    icon: FiStar,      label: 'Admin Panel',    roles: ['superuser'] },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const displayName = user?.displayName || user?.name || '';

  return (
    <aside className="fixed top-0 left-0 h-full w-[250px] bg-slate-800 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
          <FiShield className="text-white" size={18} />
        </div>
        <div>
          <div className="text-white font-semibold text-sm leading-tight">Inventory</div>
          <div className="text-indigo-300 text-xs font-medium">Avengers</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {user && (
        <div className="px-4 py-3 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {user.avatar || displayName[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-200 truncate">{displayName}</div>
              <div className="text-xs text-slate-500 capitalize">{user.role}</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-4">
        <div className="text-xs text-slate-600 text-center">StockPilot v2.0</div>
      </div>
    </aside>
  );
}
