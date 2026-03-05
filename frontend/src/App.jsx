import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Sales from './pages/Sales.jsx';
import Returns from './pages/Returns.jsx';
import Reports from './pages/Reports.jsx';
import Approvals from './pages/Approvals.jsx';
import Stores from './pages/Stores.jsx';
import EmployeeManagement from './pages/EmployeeManagement.jsx';
import EmployeeProfile from './pages/EmployeeProfile.jsx';
import UserApprovals from './pages/UserApprovals.jsx';
import AuditLog from './pages/AuditLog.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected — any authenticated user */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/inventory"
          element={<ProtectedRoute><Inventory /></ProtectedRoute>}
        />
        <Route
          path="/sales"
          element={<ProtectedRoute><Sales /></ProtectedRoute>}
        />
        <Route
          path="/returns"
          element={<ProtectedRoute><Returns /></ProtectedRoute>}
        />
        <Route
          path="/reports"
          element={
            <RoleRoute roles={['owner', 'manager']}>
              <Reports />
            </RoleRoute>
          }
        />
        <Route
          path="/approvals"
          element={<ProtectedRoute><Approvals /></ProtectedRoute>}
        />

        {/* Owner + Manager — Stores */}
        <Route
          path="/stores"
          element={
            <RoleRoute roles={['owner', 'manager']}>
              <Stores />
            </RoleRoute>
          }
        />
        <Route
          path="/audit-log"
          element={
            <RoleRoute roles={['owner']}>
              <AuditLog />
            </RoleRoute>
          }
        />

        {/* Owner + Manager */}
        <Route
          path="/employees"
          element={
            <RoleRoute roles={['owner', 'manager']}>
              <EmployeeManagement />
            </RoleRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <RoleRoute roles={['owner', 'manager']}>
              <EmployeeProfile />
            </RoleRoute>
          }
        />
        <Route
          path="/user-approvals"
          element={
            <RoleRoute roles={['owner', 'manager']}>
              <UserApprovals />
            </RoleRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
