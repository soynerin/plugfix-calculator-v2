import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface ImportLog {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface BulkImportResult {
  totalProcessed: number;
  added: number;
  skipped: number;
  errors: number;
}

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder?: string;
  exampleJson?: string;
  onImport: (data: any[]) => Promise<BulkImportResult>;
}

export function BulkImportModal({
  open,
  onOpenChange,
  title,
  description,
  placeholder = 'Pega tu JSON aquí...',
  exampleJson,
  onImport,
}: BulkImportModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const addLog = (log: ImportLog) => {
    setLogs((prev) => [...prev, log]);
  };

  const handleValidateAndImport = async () => {
    setLogs([]);
    setResult(null);

    // Validar que no esté vacío
    if (!jsonText.trim()) {
      addLog({ type: 'error', message: 'El campo está vacío' });
      return;
    }

    // Validar JSON
    let data: any[];
    try {
      data = JSON.parse(jsonText);
      addLog({ type: 'success', message: '✓ JSON válido' });
    } catch (error) {
      addLog({ type: 'error', message: `✗ JSON inválido: ${error}` });
      return;
    }

    // Validar que sea un array
    if (!Array.isArray(data)) {
      addLog({ type: 'error', message: '✗ El JSON debe ser un array de objetos' });
      return;
    }

    if (data.length === 0) {
      addLog({ type: 'warning', message: '⚠ El array está vacío' });
      return;
    }

    addLog({ type: 'info', message: `📋 Procesando ${data.length} elemento(s)...` });

    // Procesar importación
    setIsProcessing(true);
    try {
      const importResult = await onImport(data);
      setResult(importResult);
      
      addLog({ 
        type: 'success', 
        message: `✓ Importación completada: ${importResult.added} agregados, ${importResult.skipped} omitidos, ${importResult.errors} errores` 
      });
    } catch (error: any) {
      addLog({ type: 'error', message: `✗ Error en la importación: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setJsonText('');
    setLogs([]);
    setResult(null);
    onOpenChange(false);
  };

  const getLogIcon = (type: ImportLog['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Upload className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogTextColor = (type: ImportLog['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-400';
      case 'error':
        return 'text-red-700 dark:text-red-400';
      case 'warning':
        return 'text-amber-700 dark:text-amber-400';
      case 'info':
        return 'text-blue-700 dark:text-blue-400';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Textarea para JSON */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              JSON de entrada
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={placeholder}
              className="w-full h-48 p-3 text-sm font-mono border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={isProcessing}
            />
            {exampleJson && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ejemplo: {exampleJson}
              </p>
            )}
          </div>

          {/* Logs de progreso */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Registro de proceso
              </label>
              <div className="max-h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md space-y-1.5">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    {getLogIcon(log.type)}
                    <span className={getLogTextColor(log.type)}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resultado final */}
          {result && (
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-md">
              <h4 className="font-semibold text-primary-900 dark:text-primary-100 mb-2">
                Resumen de Importación
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total procesados:</span>
                  <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                    {result.totalProcessed}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Agregados:</span>
                  <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                    {result.added}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Omitidos:</span>
                  <span className="ml-2 font-semibold text-amber-600 dark:text-amber-400">
                    {result.skipped}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Errores:</span>
                  <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                    {result.errors}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button 
              onClick={handleValidateAndImport} 
              disabled={isProcessing || !jsonText.trim()}
              className="gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Validar y Guardar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
