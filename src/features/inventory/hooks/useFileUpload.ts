import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { STORAGE_FILES_QUERY_KEY } from './useStorageFiles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadedFile {
  name: string;
  path: string;
  signedUrl: string;
  size: number;
  uploadedAt: Date;
}

export interface UseFileUploadReturn {
  status: UploadStatus;
  progress: number;
  uploadedFile: UploadedFile | null;
  error: string | null;
  upload: (file: File) => Promise<void>;
  reset: () => void;
}

const BUCKET = 'price_lists';

const ACCEPTED_MIME_TYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
]);

const ACCEPTED_EXTENSIONS = ['.xls', '.xlsx', '.csv'];

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// ─── Validation ───────────────────────────────────────────────────────────────

function validateFile(file: File): string | null {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isMimeAccepted = ACCEPTED_MIME_TYPES.has(file.type);
  const isExtAccepted = ACCEPTED_EXTENSIONS.includes(extension);

  if (!isMimeAccepted && !isExtAccepted) {
    return `Formato no soportado. Por motivos de precisión, el sistema solo procesa listas en formato Excel (.xls, .xlsx) o CSV.`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `El archivo excede el límite de 50 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFileUpload(): UseFileUploadReturn {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setUploadedFile(null);
    setError(null);
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) throw new Error(validationError);

      const supabase = getSupabaseClient();
      const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${Date.now()}_${safeFilename}`;

      // Simulate upload progress (Supabase JS doesn't expose raw progress events)
      let simulatedProgress = 0;
      const interval = setInterval(() => {
        simulatedProgress = Math.min(simulatedProgress + 5, 70);
        setProgress(simulatedProgress);
      }, 150);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      clearInterval(interval);
      if (uploadError) throw new Error(uploadError.message);

      setProgress(90);

      const { data: signedData, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 3600);

      if (signedError || !signedData?.signedUrl) {
        throw new Error(signedError?.message ?? 'No se pudo obtener la URL firmada.');
      }

      setProgress(100);
      return {
        name: file.name,
        path: storagePath,
        signedUrl: signedData.signedUrl,
        size: file.size,
        uploadedAt: new Date(),
      } satisfies UploadedFile;
    },
    onMutate: () => {
      setStatus('uploading');
      setError(null);
      setProgress(0);
    },
    onSuccess: (result) => {
      setUploadedFile(result);
      setStatus('success');
      // Invalidate storage cache so the file grid refreshes automatically
      queryClient.invalidateQueries({ queryKey: STORAGE_FILES_QUERY_KEY });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Error desconocido al subir el archivo.');
      setStatus('error');
      setProgress(0);
    },
  });

  const upload = useCallback(
    (file: File) => uploadMutation.mutateAsync(file).then(() => undefined).catch(() => undefined),
    [uploadMutation],
  );

  return { status, progress, uploadedFile, error, upload, reset };
}
