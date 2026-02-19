import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  SignUpPage,
  LoginPage,
  ForgotPasswordPage,
  UpdatePasswordPage,
  AuthProvider,
  ProtectedRoute,
  GuestRoute,
  useAuth,
} from '@/features/auth';
import { motion } from 'framer-motion';
import { ProfilePage } from '@/features/profile';
import { UserMenu } from '@/shared/components/UserMenu';
import { db } from '@/core/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { CalculatorForm } from '@/features/calculator/components/CalculatorForm';
import { BrandManager } from '@/features/inventory/components/BrandManager';
import { ModelManager } from '@/features/inventory/components/ModelManager';
import { ServiceManager } from '@/features/inventory/components/ServiceManager';
import { ConfigManager } from '@/features/inventory/components/ConfigManager';
import { HistoryViewer } from '@/features/history/components/HistoryViewer';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { MobileNavBar } from '@/shared/components/MobileNavBar';
import { Toaster } from '@/shared/ui/toaster';
import { pageVariants, pageTransition } from '@/shared/utils/animations';
import { ConfirmProvider } from '@/shared/contexts/ConfirmContext';

// Crear instancia de QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 1,
    },
  },
});

// ─── MainLayout: layout principal que requiere sesión activa ──────────────────

function MainLayout() {
  const [activeTab, setActiveTab] = useState('calculator');
  const { user } = useAuth();

  const displayName =
    (user?.user_metadata?.username as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    'Usuario';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 md:py-4 max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h1 className="text-2xl md:text-3xl font-bold">PlugFix Calculator v2.0</h1>
              <p className="text-xs text-muted-foreground hidden md:block">
                Sistema de cálculo de precios para reparaciones
              </p>
            </div>
            {/* Right: theme toggle + user menu */}
            <div className="flex items-center gap-2 md:gap-3">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl pb-20 md:pb-8">
        {/* Welcome message */}
        <div className="mb-6">
          <p className="text-lg md:text-xl font-semibold text-foreground">
            ¡Hola,{' '}
            <span className="text-primary-500 dark:text-primary-400">{displayName}</span>!{' '}
            👋
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bienvenido de vuelta. Aquí está tu panel de control.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden md:grid w-full grid-cols-3 lg:w-auto lg:grid-cols-6">
            <TabsTrigger value="calculator">🧮 Calculadora</TabsTrigger>
            <TabsTrigger value="history">📋 Historial</TabsTrigger>
            <TabsTrigger value="brands">🏷️ Marcas</TabsTrigger>
            <TabsTrigger value="models">📱 Modelos</TabsTrigger>
            <TabsTrigger value="services">🔧 Servicios</TabsTrigger>
            <TabsTrigger value="config">⚙️ Config</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-4">
            <motion.div
              key="calculator"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <CalculatorForm />
            </motion.div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <motion.div
              key="history"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <HistoryViewer />
            </motion.div>
          </TabsContent>

          <TabsContent value="brands" className="space-y-4">
            <motion.div
              key="brands"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <div className="grid gap-6">
                <BrandManager />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <motion.div
              key="models"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <div className="grid gap-6">
                <ModelManager />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <motion.div
              key="services"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <div className="grid gap-6">
                <ServiceManager />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <motion.div
              key="config"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <div className="grid gap-6">
                <ConfigManager />
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="hidden md:block border-t mt-12 bg-gray-50/50 dark:bg-gray-900/20">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
              PlugFix Calculator v2.0
            </p>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center space-y-1">
              <p className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-primary-500">✓</span> <span>Supabase</span>
                <span>•</span>
                <span className="text-primary-500">✓</span> <span>TanStack Query</span>
                <span>•</span>
                <span className="text-primary-500">✓</span> <span>Clean Architecture</span>
              </p>
              <p className="flex items-center justify-center gap-1.5 flex-wrap">
                <span>React 18.3 + TypeScript 5.6</span>
                <span>•</span>
                <span>Vite 6 + Tailwind CSS 3.4</span>
                <span>•</span>
                <span>Framer Motion</span>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation Bar */}
      <MobileNavBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Inicializar base de datos
    db.initialize()
      .then(() => {
        console.log('✅ Base de datos inicializada');
        setDbInitialized(true);
      })
      .catch((err) => {
        console.error('❌ Error inicializando base de datos:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dbInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-pulse text-4xl">⚙️</div>
          <p className="text-muted-foreground">Inicializando base de datos...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <Routes>
            <Route path="/signup" element={<GuestRoute><SignUpPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><SignUpPage /></GuestRoute>} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster />
        </ConfirmProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
