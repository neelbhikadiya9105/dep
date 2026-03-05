import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';

export default function RoleRoute({ roles, children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
