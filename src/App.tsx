import { useEffect, useState, useRef } from 'react';
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
  AdminRoute,
  useAuth,
} from '@/features/auth';
import { motion } from 'framer-motion';
import { ProfilePage } from '@/features/profile';
import { UserMenu } from '@/shared/components/UserMenu';
import { db } from '@/core/services';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { CalculatorForm, type CalculatorFormHandle } from '@/features/calculator/components/CalculatorForm';
import { BrandManager } from '@/features/inventory/components/BrandManager';
import { ModelManager } from '@/features/inventory/components/ModelManager';
import { ServiceManager } from '@/features/inventory/components/ServiceManager';
import { PartTypeManager } from '@/features/inventory/components/PartTypeManager';
import { ConfigManager } from '@/features/inventory/components/ConfigManager';
import { AdminPriceManager } from '@/features/inventory/components/AdminPriceManager';
import { HistoryViewer } from '@/features/history/components/HistoryViewer';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { MobileNavBar } from '@/shared/components/MobileNavBar';
import { Toaster } from '@/shared/ui/toaster';
import { pageVariants, pageTransition } from '@/shared/utils/animations';
import { ConfirmProvider } from '@/shared/contexts/ConfirmContext';
import { useConfirm } from '@/shared/hooks/useConfirm';

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
  const [isCalculatorDirty, setIsCalculatorDirty] = useState(false);
  const calculatorRef = useRef<CalculatorFormHandle>(null);
  const { user, role } = useAuth();
  const { confirm } = useConfirm();

  useEffect(() => {
    db.initialize().catch((err) => {
      console.error('❌ Error inicializando base de datos:', err);
    });
  }, []);
  const isAdmin = role === 'admin';

  const handleTabChange = (newTab: string) => {
    if (activeTab === 'calculator' && isCalculatorDirty) {
      confirm({
        title: '¿Salir de la Calculadora?',
        message: 'Los datos ingresados se perderán si cambias de pestaña.',
        type: 'info',
        confirmText: 'Sí, salir',
        onConfirm: () => {
          calculatorRef.current?.reset();
          setActiveTab(newTab);
        },
      });
    } else {
      setActiveTab(newTab);
    }
  };

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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList
            className={`hidden md:grid w-full lg:w-auto ${
              isAdmin
                ? 'grid-cols-4 lg:grid-cols-8'
                : 'grid-cols-2 lg:grid-cols-5'
            }`}
          >
            <TabsTrigger value="calculator">🧮 Calculadora</TabsTrigger>
            <TabsTrigger value="history">📋 Historial</TabsTrigger>
            {isAdmin && <TabsTrigger value="brands">🏷️ Marcas</TabsTrigger>}
            {isAdmin && <TabsTrigger value="models">📱 Modelos</TabsTrigger>}
            <TabsTrigger value="services">🔧 Servicios</TabsTrigger>
            <TabsTrigger value="parts">📦 Repuestos</TabsTrigger>
            <TabsTrigger value="config">⚙️ Config</TabsTrigger>
            {isAdmin && <TabsTrigger value="prices">💲 Precios</TabsTrigger>}
          </TabsList>

          <TabsContent value="calculator" className="space-y-4">
            <motion.div
              key="calculator"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <CalculatorForm ref={calculatorRef} onDirtyChange={setIsCalculatorDirty} />
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
            <AdminRoute>
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
            </AdminRoute>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <AdminRoute>
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
            </AdminRoute>
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

          <TabsContent value="parts" className="space-y-4">
            <motion.div
              key="parts"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <div className="grid gap-6">
                <PartTypeManager />
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

          <TabsContent value="prices" className="space-y-4">
            <AdminRoute>
              <motion.div
                key="prices"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                transition={pageTransition}
              >
                <div className="grid gap-6">
                  <AdminPriceManager />
                </div>
              </motion.div>
            </AdminRoute>
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
      <MobileNavBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
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
