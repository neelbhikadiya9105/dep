import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Sales from './pages/Sales.jsx';
import Returns from './pages/Returns.jsx';
import Reports from './pages/Reports.jsx';
import Stores from './pages/Stores.jsx';
import EmployeeManagement from './pages/EmployeeManagement.jsx';
import EmployeeProfile from './pages/EmployeeProfile.jsx';
import AuditLog from './pages/AuditLog.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';
import NoPermission from './pages/NoPermission.jsx';
import Settings from './pages/Settings.jsx';
import SuperuserPanel from './pages/SuperuserPanel.jsx';
import SupportMessages from './pages/SupportMessages.jsx';
import useAuthStore from './store/authStore.js';

function FeatureFlagRoute({ feature, children }) {
  const hasFeature = useAuthStore((s) => s.hasFeature);
  const user = useAuthStore((s) => s.user);
  // Superusers bypass feature flag checks
  if (user?.role === 'superuser') return children;
  if (!hasFeature(feature)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/no-permission" element={<NoPermission />} />
        <Route path="/" element={<Navigate to="/landing" replace />} />

        {/* /approvals redirects to /employees (merged) */}
        <Route path="/approvals" element={<Navigate to="/employees" replace />} />

        {/* Protected — any authenticated user */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
        <Route path="/returns" element={
          <ProtectedRoute>
            <FeatureFlagRoute feature="returns">
              <Returns />
            </FeatureFlagRoute>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <RoleRoute roles={['owner', 'manager', 'superuser']}>
            <FeatureFlagRoute feature="reports">
              <Reports />
            </FeatureFlagRoute>
          </RoleRoute>
        } />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportMessages /></ProtectedRoute>} />

        {/* Superuser Panel */}
        <Route path="/superuser" element={<RoleRoute roles={['superuser']}><SuperuserPanel /></RoleRoute>} />

        {/* Owner + Manager */}
        <Route path="/stores" element={<RoleRoute roles={['owner', 'manager']}><Stores /></RoleRoute>} />
        <Route path="/audit-log" element={<RoleRoute roles={['owner']}><AuditLog /></RoleRoute>} />
        <Route path="/employees" element={
          <RoleRoute roles={['owner', 'manager']}>
            <FeatureFlagRoute feature="employees">
              <EmployeeManagement />
            </FeatureFlagRoute>
          </RoleRoute>
        } />
        <Route path="/employees/:id" element={
          <RoleRoute roles={['owner', 'manager']}>
            <FeatureFlagRoute feature="employees">
              <EmployeeProfile />
            </FeatureFlagRoute>
          </RoleRoute>
        } />
        <Route path="/user-approvals" element={<Navigate to="/employees" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
