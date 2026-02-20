import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/core/services';
import type { HistoryFilters } from '@/core/services';
import type { RepairHistory } from '@/core/domain/models';

/**
 * Hook para gestionar historial de reparaciones
 */
export function useHistory(filters?: HistoryFilters) {
  const queryClient = useQueryClient();

  // Obtener historial
  const { data: history, isLoading, error } = useQuery({
    queryKey: filters ? ['history', filters] : ['history'],
    queryFn: () => filters ? db.searchHistory(filters) : db.getAllHistory(),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Agregar entrada al historial
  const addHistory = useMutation({
    mutationFn: (entry: Omit<RepairHistory, 'id'>) => db.addHistory(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    }
  });

  // Actualizar cliente/notas de una entrada
  const updateHistory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Pick<RepairHistory, 'clientName' | 'notes'> }) =>
      db.updateHistory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  // Eliminar entrada
  const deleteHistory = useMutation({
    mutationFn: (id: string) => db.deleteHistory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    }
  });

  // Exportar historial
  const exportHistory = async (format: 'csv' | 'json') => {
    const blob = await db.exportHistory(format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    history: history || [],
    isLoading,
    isAdding: addHistory.isPending,
    isUpdating: updateHistory.isPending,
    deletingHistoryId: deleteHistory.isPending ? deleteHistory.variables : undefined,
    error,
    addHistory: addHistory.mutate,
    updateHistory: updateHistory.mutate,
    deleteHistory: deleteHistory.mutate,
    exportHistory,
  };
}
