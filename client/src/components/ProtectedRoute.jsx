import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './Feedback';

/**
 * Protege rotas no front. (A segurança real está no backend; aqui é UX.)
 * <ProtectedRoute />            -> exige login
 * <ProtectedRoute role="admin"/> -> exige admin
 */
export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Verificando sessão..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
