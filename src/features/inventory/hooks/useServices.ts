import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/core/services';
import type { Service } from '@/core/domain/models';

/**
 * Hook para gestionar servicios de reparación
 */
export function useServices() {
  const queryClient = useQueryClient();

  // Obtener todos los servicios
  const { data: services, isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: () => db.getAllServices(),
    staleTime: 5 * 60 * 1000,
  });

  // Agregar servicio
  const addService = useMutation({
    mutationFn: (service: Omit<Service, 'id'>) => db.addService(service),
    onMutate: async (newService) => {
      await queryClient.cancelQueries({ queryKey: ['services'] });
      const previousServices = queryClient.getQueryData<Service[]>(['services']);

      queryClient.setQueryData<Service[]>(['services'], (old) => [
        ...(old || []),
        { ...newService, id: 'temp-id' } as Service
      ]);

      return { previousServices };
    },
    onError: (_err, _newService, context) => {
      queryClient.setQueryData(['services'], context?.previousServices);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });

  // Actualizar servicio
  const updateService = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Service> }) =>
      db.updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });

  // Eliminar servicio
  const deleteService = useMutation({
    mutationFn: (id: string) => db.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });

  return {
    services: services || [],
    isLoading,
    error,
    addService: addService.mutate,
    updateService: updateService.mutate,
    deleteService: deleteService.mutate,
  };
}
