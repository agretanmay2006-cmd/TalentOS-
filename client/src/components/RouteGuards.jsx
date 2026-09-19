// Route guards for role-based access
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={28} className="spinner" style={{ color: 'var(--accent)' }} />
    </div>
  );
}

// Require authenticated user
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// Require specific role
export function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    // Redirect to correct portal
    return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/candidate/dashboard'} replace />;
  }
  return children;
}

// Already logged in — redirect away from /login
export function RedirectIfAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/candidate/dashboard'} replace />;
  return children;
}
