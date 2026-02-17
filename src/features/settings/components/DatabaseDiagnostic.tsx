import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { db } from '@/core/services';
import { checkSupabaseConnection } from '@/lib/supabase';
import { Database, Cloud, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface DiagnosticResult {
  provider: string;
  isSupabase: boolean;
  connectionTest?: boolean;
  brandCount?: number;
  error?: string;
  timestamp: Date;
}

/**
 * DatabaseDiagnostic - Componente para verificar qué base de datos se está usando
 * 
 * Uso: Agregar en App.tsx o en una pestaña de Settings/Debug
 */
export function DatabaseDiagnostic() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const runDiagnostic = async () => {
    setIsLoading(true);
    
    try {
      // 1. Obtener el provider configurado
      const provider = import.meta.env.VITE_DB_PROVIDER || 'dexie';
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const isSupabase = provider === 'supabase';

      const diagnosticResult: DiagnosticResult = {
        provider,
        isSupabase,
        timestamp: new Date()
      };

      // 2. Test de conexión a Supabase (solo si está configurado)
      if (isSupabase && supabaseUrl) {
        try {
          const isConnected = await checkSupabaseConnection();
          diagnosticResult.connectionTest = isConnected;
        } catch (error) {
          diagnosticResult.error = `Error conectando a Supabase: ${error}`;
        }
      }

      // 3. Obtener datos de prueba
      try {
        const brands = await db.getAllBrands();
        diagnosticResult.brandCount = brands.length;
      } catch (error) {
        diagnosticResult.error = `Error obteniendo datos: ${error}`;
      }

      setResult(diagnosticResult);
    } catch (error) {
      setResult({
        provider: 'unknown',
        isSupabase: false,
        error: `Error fatal: ${error}`,
        timestamp: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Diagnóstico de Base de Datos
        </CardTitle>
        <CardDescription>
          Verifica qué base de datos está usando actualmente la aplicación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Button to run diagnostic */}
        <Button onClick={runDiagnostic} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ejecutando diagnóstico...
            </>
          ) : (
            'Ejecutar Diagnóstico'
          )}
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Provider Info */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Base de Datos Configurada:</span>
                <div className="flex items-center gap-2">
                  {result.isSupabase ? (
                    <Cloud className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Database className="w-4 h-4 text-green-500" />
                  )}
                  <span className="font-bold">
                    {result.provider.toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {result.isSupabase 
                  ? '☁️ Usando Supabase (PostgreSQL en la nube)'
                  : '💾 Usando Dexie (IndexedDB local)'}
              </p>
            </div>

            {/* Connection Test (only for Supabase) */}
            {result.isSupabase && (
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Prueba de Conexión:</span>
                  <div className="flex items-center gap-2">
                    {result.connectionTest === true ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400">
                          Conectado
                        </span>
                      </>
                    ) : result.connectionTest === false ? (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600 dark:text-red-400">
                          No conectado
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">
                          No probado
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {result.connectionTest && (
                  <p className="text-xs text-muted-foreground">
                    ✅ Conexión exitosa a Supabase
                  </p>
                )}
              </div>
            )}

            {/* Data Test */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Prueba de Datos:</span>
                <div className="flex items-center gap-2">
                  {result.brandCount !== undefined ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">
                        {result.brandCount} {result.brandCount === 1 ? 'marca' : 'marcas'}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Error
                      </span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {result.brandCount !== undefined
                  ? `Se encontraron ${result.brandCount} marcas en la base de datos`
                  : 'No se pudieron obtener los datos'}
              </p>
            </div>

            {/* Error Display */}
            {result.error && (
              <div className="p-4 rounded-lg border border-red-500 bg-red-50 dark:bg-red-950">
                <div className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Error detectado
                    </p>
                    <p className="text-xs font-mono text-red-700 dark:text-red-300">
                      {result.error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Supabase URL (only if Supabase) */}
            {result.isSupabase && (
              <div className="p-4 rounded-lg border bg-card">
                <span className="text-sm font-medium">Supabase URL:</span>
                <p className="text-xs font-mono mt-1 text-muted-foreground break-all">
                  {import.meta.env.VITE_SUPABASE_URL || 'No configurado'}
                </p>
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-center text-muted-foreground">
              Última ejecución: {result.timestamp.toLocaleString('es-AR', {
                dateStyle: 'short',
                timeStyle: 'medium'
              })}
            </div>

            {/* Instructions */}
            <div className="p-4 rounded-lg border border-blue-500 bg-blue-50 dark:bg-blue-950">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                💡 ¿Cómo cambiar de base de datos?
              </p>
              <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>
                  Edita <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.env.local</code>
                </li>
                <li>
                  Cambia <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">VITE_DB_PROVIDER=</code>
                  a <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">dexie</code> o{' '}
                  <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">supabase</code>
                </li>
                <li>Reinicia el servidor de desarrollo (Ctrl+C → npm run dev)</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
