import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface GuestRouteProps {
  children: ReactNode;
}

/**
 * Envuelve rutas públicas de autenticación (login, registro, etc.).
 * Si el usuario ya tiene sesión activa lo redirige al panel principal.
 */
export function GuestRoute({ children }: GuestRouteProps) {
  const { user, loading } = useAuth();

  // Esperar a que Supabase resuelva la sesión antes de decidir
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

  // Ya autenticado → redirigir al panel principal
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Sin sesión → mostrar la página pública (login, signup, etc.)
  return <>{children}</>;
}
