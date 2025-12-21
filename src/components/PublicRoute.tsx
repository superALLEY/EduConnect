import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { currentUser, loading } = useAuth();

  // Wait for auth to finish loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, show the public page (login/signup)
  if (!currentUser) {
    return <>{children}</>;
  }

  // User is logged in - redirect to home
  // Let PrivateRoute handle profile completeness checks
  return <Navigate to="/" replace />;
}