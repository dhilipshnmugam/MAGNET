import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../common/Loader';
import { AlertTriangle } from 'lucide-react';

type UserRole = 'student' | 'department_admin' | 'super_admin' | 'club_admin' | 'principal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  fallback?: string;
}

export function ProtectedRoute({ children, roles, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isInitializing, user } = useAuth();
  const location = useLocation();

  if (isLoading || isInitializing) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role as UserRole)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="mt-2 text-sm text-gray-500">
          You don't have permission to view this page.
        </p>
        <button onClick={() => window.history.back()} className="btn-primary mt-6">
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isInitializing } = useAuth();

  if (isLoading || isInitializing) return <PageLoader />;

  if (isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
}

export function RoleGuard({
  children,
  roles,
  fallback,
}: {
  children: React.ReactNode;
  roles: UserRole[];
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role as UserRole)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
