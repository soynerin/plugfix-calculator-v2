import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
import { Toaster } from '@/shared/ui/toaster';
import { pageVariants, pageTransition } from '@/shared/utils/animations';

// Crear instancia de QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 1,
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold">PlugFix Calculator v2.0</h1>
                <p className="text-xs text-muted-foreground">
                  Sistema de cálculo de precios para reparaciones
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <Tabs defaultValue="calculator" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-6">
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
                <div className="grid gap-6 lg:grid-cols-2">
                  <ConfigManager />
                  <Card>
                    <CardHeader>
                      <CardTitle>Estado del Sistema</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">✅</span>
                          <span>Base de Datos: Dexie (IndexedDB)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">✅</span>
                          <span>Cache: TanStack Query</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">✅</span>
                          <span>Arquitectura: Clean Architecture</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">✅</span>
                          <span>Patrón: Repository + Adapter</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
                        <p><strong>Stack Tecnológico:</strong></p>
                        <p>• React 18.3 + TypeScript 5.6</p>
                        <p>• Vite 6 + Tailwind CSS 3.4</p>
                        <p>• shadcn/ui + Radix UI</p>
                        <p>• Dexie 4 + TanStack Query 5</p>
                        <p>• Zustand 5 para estado global</p>
                        <p>• Framer Motion para animaciones</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="border-t mt-12">
          <div className="container mx-auto px-4 py-4 text-center text-xs text-muted-foreground/60 max-w-7xl">
            <p>PlugFix Calculator v2.0</p>
          </div>
        </footer>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
