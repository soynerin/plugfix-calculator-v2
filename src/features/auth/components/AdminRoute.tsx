import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
  children: ReactNode;
  /** Where to redirect non-admins. Defaults to "/". */
  redirectTo?: string;
}

/**
 * AdminRoute — guards routes/content that require the "admin" role.
 *
 * Usage as a route wrapper (in App.tsx):
 *   <Route path="/admin/brands" element={<AdminRoute><BrandManager /></AdminRoute>} />
 *
 * Usage as inline content guard:
 *   {role === 'admin' && <AdminRoute><SomeAdminUI /></AdminRoute>}
 */
export function AdminRoute({ children, redirectTo = '/' }: AdminRouteProps) {
  const { role, loading } = useAuth();

  // Still fetching auth state — render nothing to avoid flash
  if (loading) return null;

  // Not an admin → redirect
  if (role !== 'admin') {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
