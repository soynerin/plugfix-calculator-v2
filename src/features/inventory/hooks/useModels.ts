import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/core/services';
import type { RepairModel } from '@/core/domain/models';

/**
 * Hook para gestionar modelos de reparación con TanStack Query
 */
export function useModels(brandId?: string) {
  const queryClient = useQueryClient();

  // Obtener modelos por marca
  const { data: models, isLoading, error } = useQuery({
    queryKey: brandId ? ['models', brandId] : ['models'],
    queryFn: () => brandId ? db.getModelsByBrand(brandId) : db.searchModels(''),
    staleTime: 5 * 60 * 1000,
    enabled: !!brandId || brandId === undefined,
  });

  // Agregar modelo
  const addModel = useMutation({
    mutationFn: (model: Omit<RepairModel, 'id'>) => db.addModel(model),
    onMutate: async (newModel) => {
      await queryClient.cancelQueries({ queryKey: ['models'] });
      const previousModels = queryClient.getQueryData<RepairModel[]>(['models']);

      queryClient.setQueryData<RepairModel[]>(['models'], (old) => [
        ...(old || []),
        { ...newModel, id: 'temp-id' } as RepairModel
      ]);

      return { previousModels };
    },
    onError: (_err, _newModel, context) => {
      queryClient.setQueryData(['models'], context?.previousModels);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    }
  });

  // Actualizar modelo
  const updateModel = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RepairModel> }) =>
      db.updateModel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    }
  });

  // Eliminar modelo
  const deleteModel = useMutation({
    mutationFn: (id: string) => db.deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    }
  });

  // Bulk import de modelos
  const bulkAddModels = useMutation({
    mutationFn: (models: Omit<RepairModel, 'id'>[]) => db.bulkAddModels(models),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    }
  });

  // Buscar modelos
  const searchModels = async (query: string) => {
    return db.searchModels(query);
  };

  return {
    models: models || [],
    isLoading,
    error,
    addModel: addModel.mutate,
    updateModel: updateModel.mutate,
    deleteModel: deleteModel.mutate,
    bulkAddModels: bulkAddModels.mutateAsync,
    searchModels
  };
}
