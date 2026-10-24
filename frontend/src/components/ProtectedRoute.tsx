import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../stores/auth';

interface RouteProps {
  children?: React.ReactNode;
  requiredRole?: 'ADMIN' | 'MEMBER' | 'USER';
}

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-12 h-12">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20"></div>
        <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin"></div>
      </div>
      <p className="text-slate-400 text-sm font-medium">Checking session...</p>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<RouteProps> = ({ children, requiredRole }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/projects" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const PublicRoute: React.FC<RouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/projects" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
