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
  const { role, loading, roleLoading } = useAuth();

  // Block rendering only on initial load when the role hasn't been resolved
  // yet. If we already have a role value, render immediately — returning null
  // here would unmount children and lose their local state.
  if (role === null && (loading || roleLoading)) return null;

  // Not an admin → redirect
  if (role !== 'admin') {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
