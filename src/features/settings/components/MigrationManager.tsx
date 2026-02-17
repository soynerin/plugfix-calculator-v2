import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { MigrationService, type MigrationProgress, type MigrationResult } from '@/core/services';
import { Database, Cloud, CheckCircle2, AlertCircle, Loader2, Download, Upload } from 'lucide-react';

/**
 * MigrationManager - Componente para migrar datos de Dexie a Supabase
 * 
 * Uso:
 * 1. Importar en App.tsx o en una pestaña Settings
 * 2. Renderizar cuando VITE_DB_PROVIDER=dexie y usuario quiere migrar a cloud
 */
export function MigrationManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const currentProvider = import.meta.env.VITE_DB_PROVIDER || 'dexie';

  const handleMigrate = async () => {
    setIsLoading(true);
    setResult(null);
    setProgress(null);

    try {
      const migration = new MigrationService((prog) => {
        setProgress(prog);
      });

      const migrationResult = await migration.migrateToSupabase();
      setResult(migrationResult);

      if (migrationResult.success) {
        // Auto-verificar después de migración exitosa
        await handleVerify();
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error inesperado: ${error}`,
        stats: { brands: 0, models: 0, services: 0, history: 0 },
        errors: [String(error)]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setIsLoading(true);
    
    try {
      const migration = new MigrationService();
      const verification = await migration.verifyMigration();

      console.log('Verificación de migración:', verification);
    } catch (error) {
      console.error('Error verificando migración:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackup = async () => {
    setIsLoading(true);
    
    try {
      const migration = new MigrationService();
      const blob = await migration.backupSupabase();

      // Descargar archivo
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plugfix-backup-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      alert('Backup descargado exitosamente');
    } catch (error) {
      alert(`Error creando backup: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (file: File) => {
    if (!confirm('⚠️ Esto sobrescribirá todos los datos actuales. ¿Continuar?')) {
      return;
    }

    setIsLoading(true);
    
    try {
      const migration = new MigrationService();
      const restorationResult = await migration.restoreFromBackup(file);
      
      setResult(restorationResult);
    } catch (error) {
      setResult({
        success: false,
        message: `Error restaurando backup: ${error}`,
        stats: { brands: 0, models: 0, services: 0, history: 0 },
        errors: [String(error)]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Provider Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentProvider === 'dexie' ? (
              <Database className="w-5 h-5" />
            ) : (
              <Cloud className="w-5 h-5" />
            )}
            Base de Datos Actual
          </CardTitle>
          <CardDescription>
            Estás usando: <strong>{currentProvider === 'dexie' ? 'Dexie (Local/Offline)' : 'Supabase (Cloud)'}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentProvider === 'dexie' ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Tus datos están guardados localmente en IndexedDB. Para acceder desde múltiples dispositivos
                o tener backup en la nube, migra a Supabase.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleMigrate} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Migrando...
                    </>
                  ) : (
                    <>
                      <Cloud className="mr-2 h-4 w-4" />
                      Migrar a Supabase
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Tus datos están en la nube con Supabase. Puedes crear backups o restaurar datos previos.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleBackup} disabled={isLoading} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Backup
                </Button>
                <Button
                  onClick={() => document.getElementById('file-input')?.click()}
                  disabled={isLoading}
                  variant="outline"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Restaurar Backup
                </Button>
                <input
                  id="file-input"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleRestore(file);
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle>Progreso de Migración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{progress.step}</span>
                <span className="font-medium">{progress.percentage}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Paso {progress.current} de {progress.total}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className={result.success ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Migración Exitosa
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Migración con Errores
                </>
              )}
            </CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Marcas</p>
                <p className="text-2xl font-bold">{result.stats.brands}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Modelos</p>
                <p className="text-2xl font-bold">{result.stats.models}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Servicios</p>
                <p className="text-2xl font-bold">{result.stats.services}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Historial</p>
                <p className="text-2xl font-bold">{result.stats.history}</p>
              </div>
            </div>

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-500">
                  Errores ({result.errors.length}):
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((error, i) => (
                    <p key={i} className="text-xs text-red-600 font-mono bg-red-50 dark:bg-red-950 p-2 rounded">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {result.success && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  ✅ Próximos pasos:
                </p>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Actualiza <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.env.local</code>: <code>VITE_DB_PROVIDER=supabase</code></li>
                  <li>Reinicia el servidor de desarrollo (<code>npm run dev</code>)</li>
                  <li>Verifica que los datos se carguen correctamente</li>
                  <li>(Opcional) Limpia la base de datos local de Dexie</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>¿Cómo funciona la migración?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">1. Preparación</p>
            <p>
              Asegúrate de haber configurado Supabase correctamente. Ver{' '}
              <code className="bg-secondary px-1 rounded">docs/SUPABASE_SETUP.md</code>
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="font-medium text-foreground">2. Durante la Migración</p>
            <p>
              El proceso copia brands → services → models → config → history.
              No modifica ni elimina datos de Dexie.
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="font-medium text-foreground">3. Después de Migrar</p>
            <p>
              Cambia <code className="bg-secondary px-1 rounded">VITE_DB_PROVIDER=supabase</code> en{' '}
              <code className="bg-secondary px-1 rounded">.env.local</code> y reinicia
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-foreground">⚠️ Importante</p>
            <p>
              Si migras exitosamente, puedes eliminar los datos locales de Dexie para liberar espacio.
              Guarda un backup antes por seguridad.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
