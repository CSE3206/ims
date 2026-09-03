/** Blocks a route until the user is signed in (and optionally has a role). */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="empty-state">
        <h2>Not allowed</h2>
        <p>This page is limited to: {roles.join(', ')}.</p>
      </div>
    );
  }
  return children;
}
