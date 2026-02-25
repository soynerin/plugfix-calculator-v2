import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import type { FileObject } from '@supabase/storage-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { FileObject };

export interface UseStorageFilesReturn {
  files: FileObject[];
  isLoading: boolean;
  /** Path currently being deleted (null when idle). */
  deletingPath: string | null;
  /** Manually re-fetch (e.g. for the Refresh button). */
  refetch: () => void;
  deleteFile: (path: string) => Promise<void>;
}

export const STORAGE_FILES_QUERY_KEY = ['storage-files', 'price_lists'] as const;

const BUCKET = 'price_lists';

async function fetchStorageFiles(): Promise<FileObject[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) throw error;
  // Filter out the default .emptyFolderPlaceholder Supabase inserts
  return (data ?? []).filter((f) => f.name !== '.emptyFolderPlaceholder');
}

async function removeStorageFile(path: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStorageFiles(): UseStorageFilesReturn {
  const queryClient = useQueryClient();
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  const { data: files = [], isLoading, refetch } = useQuery<FileObject[]>({
    queryKey: STORAGE_FILES_QUERY_KEY,
    queryFn: fetchStorageFiles,
    // Cache for 30 minutes — the list is admin-only and changes only on
    // explicit upload/delete, which both invalidate the cache via onSuccess.
    staleTime: 1000 * 60 * 30,
    // Keep previous data visible while re-fetching so the grid never flashes empty
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (path: string) => {
      setDeletingPath(path);
      return removeStorageFile(path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORAGE_FILES_QUERY_KEY });
    },
    onSettled: () => {
      setDeletingPath(null);
    },
  });

  const deleteFile = useCallback(
    (path: string) => deleteMutation.mutateAsync(path),
    [deleteMutation],
  );

  return {
    files,
    isLoading,
    deletingPath,
    refetch: () => void refetch(),
    deleteFile,
  };
}
