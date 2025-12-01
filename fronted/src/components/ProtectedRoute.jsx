// components/ProtectedRoute.js
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ user, children, requireAdmin = false }) => {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin) {
    if (user.role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Check for contributor routes
  if (location.pathname.startsWith('/contributor')) {
    if (user.role !== 'contributor' && user.role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If user is admin but trying to access user dashboard from admin route
  if (user.role === 'admin' && location.pathname === '/dashboard') {
    
  }

  return children;
};

export default ProtectedRoute;