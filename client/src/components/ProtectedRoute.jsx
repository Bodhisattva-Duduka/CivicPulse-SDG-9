import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUser } from '../lib/auth';

export default function ProtectedRoute({ children, roles }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (roles) {
    const user = getUser();
    if (!roles.includes(user?.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
