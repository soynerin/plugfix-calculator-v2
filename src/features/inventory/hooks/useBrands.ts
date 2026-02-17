import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/core/services';
import type { Brand } from '@/core/domain/models';

/**
 * Hook personalizado para gestionar marcas con TanStack Query
 * Ejemplo de uso del patrón Repository con cache y optimistic updates
 */
export function useBrands() {
  const queryClient = useQueryClient();

  // Obtener todas las marcas
  const { data: brands, isLoading, error } = useQuery({
    queryKey: ['brands'],
    queryFn: () => db.getAllBrands(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Agregar marca (con optimistic update)
  const addBrand = useMutation({
    mutationFn: (brand: Omit<Brand, 'id'>) => db.addBrand(brand),
    onMutate: async (newBrand) => {
      // Cancelar refetch en progreso
      await queryClient.cancelQueries({ queryKey: ['brands'] });

      // Snapshot del estado anterior
      const previousBrands = queryClient.getQueryData<Brand[]>(['brands']);

      // Optimistic update
      queryClient.setQueryData<Brand[]>(['brands'], (old) => [
        ...(old || []),
        { ...newBrand, id: 'temp-id' } as Brand
      ]);

      return { previousBrands };
    },
    onError: (_err, _newBrand, context) => {
      // Rollback en caso de error
      queryClient.setQueryData(['brands'], context?.previousBrands);
    },
    onSettled: () => {
      // Refetch para sincronizar
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    }
  });

  // Eliminar marca
  const deleteBrand = useMutation({
    mutationFn: (id: string) => db.deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['models'] }); // Invalida modelos también
    }
  });

  // Buscar marcas
  const searchBrands = async (query: string) => {
    return db.searchBrands(query);
  };

  return {
    brands: brands || [],
    isLoading,
    error,
    addBrand: addBrand.mutate,
    deleteBrand: deleteBrand.mutate,
    searchBrands
  };
}
