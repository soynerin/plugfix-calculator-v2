import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Mientras Supabase verifica el token local, mostramos un loader
  // para evitar el parpadeo hacia /login antes de confirmar la sesión.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Sin sesión → redirigir a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Con sesión → renderizar la ruta protegida
  return <>{children}</>;
}
