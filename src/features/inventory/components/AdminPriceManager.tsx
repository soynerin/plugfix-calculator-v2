import { useState, useCallback, useRef, DragEvent } from 'react';
import {
  UploadCloud, FileText, FileSpreadsheet, CheckCircle2, XCircle,
  RefreshCw, ExternalLink, Copy, Check, Trash2, Cpu, FolderOpen,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useFileUpload } from '../hooks/useFileUpload';
import { useStorageFiles } from '../hooks/useStorageFiles';
import type { FileObject } from '../hooks/useStorageFiles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/components/Spinner';
import { cn } from '@/shared/utils';
import { useToast } from '@/shared/hooks/use-toast';
import { useConfirm } from '@/shared/hooks/useConfirm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const ACCEPTED_MIME_MAP: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/csv': '.csv',
};

const ACCEPTED_ACCEPT_STRING = Object.keys(ACCEPTED_MIME_MAP).join(',') + ',.xls,.xlsx,.csv,.pdf';

// ─── DropZone ─────────────────────────────────────────────────────────────────

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  disabled?: boolean;
}

function DropZone({ onFileDrop, disabled }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) onFileDrop(file);
  }, [disabled, onFileDrop]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileDrop(file);
    // Reset input so the same file can be re-selected after an error
    e.target.value = '';
  }, [onFileDrop]);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Zona de carga de archivos. Arrastrá un archivo o hacé clic para seleccionar."
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          fileInputRef.current?.click();
        }
      }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-4',
        'rounded-xl border-2 border-dashed px-6 py-12 text-center',
        'transition-all duration-200 select-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        disabled
          ? 'cursor-not-allowed opacity-50 border-gray-300 dark:border-gray-700'
          : isDragOver
            ? 'cursor-copy border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.01]'
            : 'cursor-pointer border-gray-300 dark:border-gray-700 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/40',
      )}
    >
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_ACCEPT_STRING}
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled}
        tabIndex={-1}
      />

      {/* Cloud icon */}
      <div className={cn(
        'rounded-full p-4 transition-colors duration-200',
        isDragOver
          ? 'bg-primary-100 dark:bg-primary-900/40'
          : 'bg-gray-100 dark:bg-gray-800',
      )}>
        <UploadCloud className={cn(
          'w-10 h-10 transition-colors duration-200',
          isDragOver
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-400 dark:text-gray-500',
        )} />
      </div>

      {/* Text */}
      <div className="space-y-1.5">
        <p className={cn(
          'text-sm font-semibold transition-colors duration-200',
          isDragOver ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200',
        )}>
          {isDragOver ? 'Soltá el archivo aquí' : 'Arrastrá tu lista de precios aquí'}
        </p>
        <p className="text-xs text-muted-foreground">
          o{' '}
          <span className="text-primary-600 dark:text-primary-400 font-medium underline underline-offset-2">
            hacé clic para seleccionar
          </span>
        </p>
      </div>

      {/* Supported formats badge */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
        {['.pdf', '.xls', '.xlsx', '.csv'].map((ext) => (
          <span
            key={ext}
            className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-mono font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
          >
            {ext}
          </span>
        ))}
        <span className="text-[11px] text-muted-foreground">· máx. 50 MB</span>
      </div>
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Subiendo...</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-300 ease-out"
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be blocked in insecure contexts — fail silently
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 w-7 p-0 shrink-0"
      title="Copiar URL"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </Button>
  );
}

// ─── File icon helper ─────────────────────────────────────────────────────────

function FileIcon({ name, className }: { name: string; className?: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') {
    return <FileText className={cn('text-red-500 dark:text-red-400', className)} />;
  }
  if (ext === 'csv') {
    return <FileSpreadsheet className={cn('text-emerald-600 dark:text-emerald-400', className)} />;
  }
  // xls / xlsx
  return <FileSpreadsheet className={cn('text-green-600 dark:text-green-400', className)} />;
}

// Extract the human-readable original name by stripping the leading timestamp prefix
// e.g. "1740000000000_Samsung_Price_List.pdf" → "Samsung_Price_List.pdf"
function displayName(storagePath: string): string {
  return storagePath.replace(/^\d+_/, '').replace(/_/g, ' ');
}

// ─── FileCard ─────────────────────────────────────────────────────────────────

interface FileCardProps {
  file: FileObject;
  isDeleting: boolean;
  onDelete: (path: string) => void;
  onProcess: (file: FileObject) => void;
}

function FileCard({ file, isDeleting, onDelete, onProcess }: FileCardProps) {
  const sizeBytes: number = (file.metadata as Record<string, number> | null)?.size ?? 0;
  const createdAt = file.created_at ? new Date(file.created_at) : null;

  return (
    <div className={cn(
      'flex flex-col rounded-xl border bg-card shadow-sm transition-opacity duration-200',
      isDeleting && 'opacity-50 pointer-events-none',
    )}>
      {/* Card body */}
      <div className="flex items-start gap-3 p-4 flex-1">
        {/* Icon */}
        <div className="shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 p-2.5">
          <FileIcon name={file.name} className="w-6 h-6" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p
            className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate"
            title={displayName(file.name)}
          >
            {displayName(file.name)}
          </p>
          <p className="text-xs text-muted-foreground font-mono truncate" title={file.name}>
            {file.name}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {createdAt && (
              <span className="text-[11px] text-muted-foreground">
                {createdAt.toLocaleDateString('es-AR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </span>
            )}
            {sizeBytes > 0 && (
              <span className="text-[11px] text-muted-foreground">{formatBytes(sizeBytes)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div className="flex items-center gap-2 border-t px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onProcess(file)}
          className="flex-1 gap-1.5 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-900/20"
        >
          <Cpu className="w-3.5 h-3.5" />
          Procesar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(file.name)}
          disabled={isDeleting}
          className="gap-1.5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          {isDeleting
            ? <Spinner size="sm" variant="danger" />
            : <Trash2 className="w-3.5 h-3.5" />
          }
        </Button>
      </div>
    </div>
  );
}

// ─── StoredFilesList ──────────────────────────────────────────────────────────

interface StoredFilesListProps {
  files: FileObject[];
  isLoading: boolean;
  deletingPath: string | null;
  onDelete: (path: string) => void;
  onProcess: (file: FileObject) => void;
  onRefresh: () => void;
}

function StoredFilesList({
  files, isLoading, deletingPath, onDelete, onProcess, onRefresh,
}: StoredFilesListProps) {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Listas de Precios Almacenadas
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2"
          title="Actualizar lista"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {/* Loading skeleton */}
      {isLoading && files.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && files.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-14 gap-4 text-center">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4">
            <FolderOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Aún no subiste ninguna lista de precios
            </p>
            <p className="text-xs text-muted-foreground">
              Arrastrá un archivo en la zona de arriba para comenzar.
            </p>
          </div>
        </div>
      )}

      {/* File grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <FileCard
              key={file.id ?? file.name}
              file={file}
              isDeleting={deletingPath === file.name}
              onDelete={onDelete}
              onProcess={onProcess}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AdminPriceManager ────────────────────────────────────────────────────────

/**
 * AdminPriceManager — visible exclusively to users with role === 'admin'.
 *
 * Responsibilities:
 * 1. Role guard: renders an "Acceso Denegado" state for non-admins.
 * 2. Drag-and-drop file upload zone (PDF / XLS / XLSX / CSV, max 50 MB).
 * 3. Uploads the file to the Supabase Storage `price_lists` bucket.
 * 4. Shows a responsive grid of stored files with Delete and Process actions.
 */
export function AdminPriceManager() {
  const { role, loading, roleLoading } = useAuth();
  const { status, progress, uploadedFile, error, upload, reset } = useFileUpload();
  const { files, isLoading: isLoadingFiles, deletingPath, refetch, deleteFile } = useStorageFiles();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // No useEffects needed — useQuery handles initial fetch and cache invalidation
  // triggers refetch automatically after upload/delete mutations.

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (loading || roleLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Verificando permisos...</p>
        </CardContent>
      </Card>
    );
  }

  if (role !== 'admin') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
            <XCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Acceso Denegado
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Solo los administradores pueden gestionar listas de precios de proveedores.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleFileDrop = (file: File) => {
    if (status !== 'idle') reset();
    upload(file);
  };

  const handleDelete = (path: string) => {
    confirm({
      title: 'Eliminar archivo',
      message: `¿Eliminás "${displayName(path)}" del storage? Esta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Sí, eliminar',
      onConfirm: async () => {
        try {
          await deleteFile(path);
          toast({ title: 'Archivo eliminado', description: displayName(path) });
        } catch {
          toast({
            title: 'Error al eliminar',
            description: 'No se pudo eliminar el archivo. Intentá de nuevo.',
            variant: 'destructive',
          });
        }
      },
    });
  };

  const handleProcess = (file: FileObject) => {
    // Placeholder — will be wired to Claude AI in the next stage
    console.log('Preparando para procesar:', file.name);
    toast({
      title: 'Próximamente',
      description: `El procesamiento con IA de "${displayName(file.name)}" estará disponible en la siguiente etapa.`,
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UploadCloud className="w-5 h-5 text-primary-500" />
          Listas de Precios de Proveedores
        </CardTitle>
        <CardDescription>
          Subí un archivo con los precios de repuestos. Los formatos soportados son PDF,
          Excel (.xls / .xlsx) y CSV. Tamaño máximo: 50 MB.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">

        {/* ── Upload zone section ── */}
        <div className="space-y-4">
          <DropZone
            onFileDrop={handleFileDrop}
            disabled={status === 'uploading'}
          />

          {/* Uploading state */}
          {status === 'uploading' && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <Spinner size="sm" />
                <span className="text-sm font-medium">Subiendo archivo...</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}

          {/* Error state */}
          {status === 'error' && error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">Error al subir</p>
                <p className="text-sm text-red-600 dark:text-red-400 break-words">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="h-8 gap-1.5 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 px-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Intentar de nuevo
                </Button>
              </div>
            </div>
          )}

          {/* Success state */}
          {status === 'success' && uploadedFile && (
            <div className="w-full overflow-hidden rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                    Archivo subido correctamente
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    {uploadedFile.uploadedAt.toLocaleString('es-AR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-md border border-green-200 dark:border-green-700 bg-white dark:bg-gray-900/60 px-3 py-2.5">
                <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-100">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatBytes(uploadedFile.size)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-green-800 dark:text-green-300 uppercase tracking-wide">
                  URL firmada (válida 1 hora)
                </p>
                <div className="w-full overflow-hidden rounded-md border border-green-200 dark:border-green-700 bg-white dark:bg-gray-900/60">
                  {/* URL text — break-all so the long token never causes horizontal overflow */}
                  <div className="px-3 py-2 overflow-x-auto">
                    <code className="block text-[11px] text-gray-600 dark:text-gray-400 font-mono break-all whitespace-pre-wrap">
                      {uploadedFile.signedUrl}
                    </code>
                  </div>
                  {/* Action row */}
                  <div className="flex items-center gap-1 border-t border-green-100 dark:border-green-800 px-2 py-1.5">
                    <span className="flex-1 text-[10px] text-muted-foreground truncate pl-1">
                      Copiá la URL para usarla con IA
                    </span>
                    <CopyButton text={uploadedFile.signedUrl} />
                    <a
                      href={uploadedFile.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/40"
                      title="Abrir en nueva pestaña"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    </a>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="gap-1.5 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Subir otro archivo
              </Button>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="border-t" />

        {/* ── Stored files section ── */}
        <StoredFilesList
          files={files}
          isLoading={isLoadingFiles}
          deletingPath={deletingPath}
          onDelete={handleDelete}
          onProcess={handleProcess}
          onRefresh={refetch}
        />

      </CardContent>
    </Card>
  );
}
