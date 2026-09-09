import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { PageLoader } from '@/components/Loading';

/**
 * Gate for authenticated routes. `roles` (optional) restricts to specific roles;
 * a signed-in user without the role gets a 403 view, an anonymous user is sent
 * to `loginPath` (default the customer /login) with returnTo.
 *
 * Staff areas pass loginPath="/staff/login" so shop & admin accounts have their
 * own entrance, separate from the customer sign-in used only for buying/booking.
 */
export default function ProtectedRoute({ roles, loginPath = '/login' }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${loginPath}?returnTo=${returnTo}`} replace />;
  }

  if (roles && !roles.flat().includes(user.role)) {
    return (
      <div className="max-w-lg mx-auto text-center py-24 px-6">
        <h1 className="font-display text-3xl text-neutral-900 mb-2">Not available for your account</h1>
        <p className="text-neutral-500">
          This area is for {roles.flat().join(' / ').toLowerCase()} accounts. You are signed in as{' '}
          {user.role.toLowerCase()}.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
