import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import FullPageLoader from './ui/FullPageLoader.jsx';

export default function RoleRoute({ roles, children }) {
  const { isAuthenticated, user, featureFlagsLoaded } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!featureFlagsLoaded) return <FullPageLoader />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
