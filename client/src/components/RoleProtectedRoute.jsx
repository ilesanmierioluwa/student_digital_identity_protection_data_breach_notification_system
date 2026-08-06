import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RoleProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Verifying your session...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}
