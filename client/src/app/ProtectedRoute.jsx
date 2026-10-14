import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

export function ProtectedRoute() {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-app p-6 flex flex-col justify-center items-center gap-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-32 w-full rounded-token" />
          <Skeleton className="h-24 w-full rounded-token" />
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
