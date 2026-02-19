import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/core/services';
import type { PartType } from '@/core/domain/models';

/**
 * Hook para gestionar tipos de repuestos (part_types)
 */
export function usePartTypes() {
  const queryClient = useQueryClient();

  const { data: partTypes, isLoading, error } = useQuery({
    queryKey: ['partTypes'],
    queryFn: () => db.getAllPartTypes(),
    staleTime: 5 * 60 * 1000,
  });

  const addPartType = useMutation({
    mutationFn: (partType: Omit<PartType, 'id'>) => db.addPartType(partType),
    onMutate: async (newPartType) => {
      await queryClient.cancelQueries({ queryKey: ['partTypes'] });
      const previous = queryClient.getQueryData<PartType[]>(['partTypes']);
      queryClient.setQueryData<PartType[]>(['partTypes'], (old) => [
        ...(old || []),
        { ...newPartType, id: 'temp-id' } as PartType,
      ]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['partTypes'], ctx?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['partTypes'] });
    },
  });

  const bulkAddPartTypes = useMutation({
    mutationFn: (partTypes: Omit<PartType, 'id'>[]) => db.bulkAddPartTypes(partTypes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partTypes'] });
    },
  });

  const updatePartType = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PartType> }) =>
      db.updatePartType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partTypes'] });
    },
  });

  const deletePartType = useMutation({
    mutationFn: (id: string) => db.deletePartType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partTypes'] });
    },
  });

  return {
    partTypes: partTypes || [],
    isLoading,
    isAdding: addPartType.isPending,
    isImporting: bulkAddPartTypes.isPending,
    isUpdating: updatePartType.isPending,
    deletingPartTypeId: deletePartType.isPending ? deletePartType.variables : undefined,
    error,
    addPartType: addPartType.mutate,
    bulkAddPartTypes: bulkAddPartTypes.mutateAsync,
    updatePartType: updatePartType.mutate,
    deletePartType: deletePartType.mutate,
  };
}
