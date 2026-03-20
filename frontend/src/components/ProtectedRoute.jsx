import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import FullPageLoader from './ui/FullPageLoader.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, featureFlagsLoaded } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Show a spinner while feature flags are still being fetched after login
  if (!featureFlagsLoaded) return <FullPageLoader />;
  return children;
}
