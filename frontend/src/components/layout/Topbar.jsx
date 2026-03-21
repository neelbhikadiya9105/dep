import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiLogOut, FiSettings, FiChevronDown, FiMessageSquare } from 'react-icons/fi';
import { RoleBadge } from '../ui/Badge.jsx';
import NotificationDropdown from '../NotificationDropdown.jsx';
import useAuthStore from '../../store/authStore.js';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/sales':     'Sales / POS',
  '/returns':   'Returns',
  '/reports':   'Reports',
  '/stores':    'Stores',
  '/employees': 'Employee Management',
  '/audit-log': 'Audit Log',
  '/settings':  'Settings',
  '/superuser': 'Admin Panel',
  '/support':   'Support Messages',
};

export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, shopBranding } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Handle dynamic paths like /employees/:id
  const pathKey = Object.keys(PAGE_TITLES).find((k) =>
    location.pathname === k || location.pathname.startsWith(k + '/')
  );
  const title = PAGE_TITLES[pathKey] || 'Dashboard';

  const displayName = user?.displayName || user?.name || '';
  const shopName = shopBranding?.shopName || shopBranding?.name || '';

  return (
    <header className="fixed top-0 left-[250px] right-0 h-[60px] bg-white border-b border-slate-100 flex items-center justify-between px-6 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-slate-800">{title}</h1>
        {shopName && user?.role !== 'superuser' && (
          <span className="text-xs text-slate-400 hidden sm:inline">— {shopName}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user && <RoleBadge role={user.role} />}
        <NotificationDropdown />

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-all"
            title="Profile menu"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
              {user?.avatar || displayName[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block">{displayName}</span>
            <FiChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
              {/* User info (read-only) */}
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              {/* Settings link */}
              <Link
                to="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-all"
              >
                <FiSettings size={14} />
                Settings
              </Link>
              {/* Help / Support link (non-superuser) */}
              {user?.role !== 'superuser' && (
                <Link
                  to="/support"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-all"
                >
                  <FiMessageSquare size={14} />
                  Help / Support
                </Link>
              )}
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-all"
              >
                <FiLogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
