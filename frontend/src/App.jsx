import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Sales from './pages/Sales.jsx';
import Returns from './pages/Returns.jsx';
import Reports from './pages/Reports.jsx';
import Approvals from './pages/Approvals.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected */}
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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
