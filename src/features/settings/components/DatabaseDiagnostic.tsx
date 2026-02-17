import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { db } from '@/core/services';
import { checkSupabaseConnection } from '@/lib/supabase';
import { Cloud, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface DiagnosticResult {
  connectionTest?: boolean;
  brandCount?: number;
  error?: string;
  timestamp: Date;
}

/**
 * DatabaseDiagnostic - Componente para verificar la conexión con Supabase
 * 
 * Uso: Agregar en App.tsx o en una pestaña de Settings/Debug
 */
export function DatabaseDiagnostic() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const runDiagnostic = async () => {
    setIsLoading(true);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const diagnosticResult: DiagnosticResult = {
        timestamp: new Date()
      };

      // Test de conexión a Supabase
      if (supabaseUrl) {
        try {
          const isConnected = await checkSupabaseConnection();
          diagnosticResult.connectionTest = isConnected;
        } catch (error) {
          diagnosticResult.error = `Error conectando a Supabase: ${error}`;
        }
      }

      // Obtener datos de prueba
      try {
        const brands = await db.getAllBrands();
        diagnosticResult.brandCount = brands.length;
      } catch (error) {
        diagnosticResult.error = `Error obteniendo datos: ${error}`;
      }

      setResult(diagnosticResult);
    } catch (error) {
      setResult({
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
          <Cloud className="w-5 h-5" />
          Diagnóstico de Supabase
        </CardTitle>
        <CardDescription>
          Verifica la conexión con Supabase y el estado de la base de datos
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
            {/* Connection Test */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Prueba de Conexión:</span>
                <div className="flex items-center gap-2">
                  {result.connectionTest === true ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-primary-500" />
                      <span className="text-sm text-primary-600 dark:text-primary-400">
                        Conectado
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">
                        No conectado
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

            {/* Data Test */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Prueba de Datos:</span>
                <div className="flex items-center gap-2">
                  {result.brandCount !== undefined ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-primary-500" />
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

            {/* Supabase URL */}
            <div className="p-4 rounded-lg border bg-card">
              <span className="text-sm font-medium">Supabase URL:</span>
              <p className="text-xs font-mono mt-1 text-muted-foreground break-all">
                {import.meta.env.VITE_SUPABASE_URL || 'No configurado'}
              </p>
            </div>

            {/* Timestamp */}
            <div className="text-xs text-center text-muted-foreground">
              Última ejecución: {result.timestamp.toLocaleString('es-AR', {
                dateStyle: 'short',
                timeStyle: 'medium'
              })}
            </div>

            {/* Instructions */}
            <div className="p-4 rounded-lg border border-primary-500 bg-primary-50 dark:bg-primary-900/30">
              <p className="text-sm font-medium text-primary-800 dark:text-primary-100 mb-2">
                💡 Configuración
              </p>
              <p className="text-xs text-primary-700 dark:text-primary-200">
                Las credenciales de Supabase se configuran en el archivo{' '}
                <code className="bg-primary-100 dark:bg-primary-900 px-1 rounded">.env.local</code>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
