import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/core/services';
import type { PriceConfig } from '@/core/domain/models';

/**
 * Hook para gestionar configuración de precios
 */
export function useConfig() {
  const queryClient = useQueryClient();

  // Obtener configuración
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['config'],
    queryFn: () => db.getConfig(),
    staleTime: 10 * 60 * 1000, // 10 minutos (config cambia poco)
  });

  // Actualizar configuración
  const updateConfig = useMutation({
    mutationFn: (data: Partial<PriceConfig>) => db.updateConfig(data),
    onMutate: async (newConfig) => {
      await queryClient.cancelQueries({ queryKey: ['config'] });
      const previousConfig = queryClient.getQueryData<PriceConfig>(['config']);

      queryClient.setQueryData<PriceConfig>(['config'], (old) => ({
        ...old!,
        ...newConfig,
      }));

      return { previousConfig };
    },
    onError: (_err, _newConfig, context) => {
      queryClient.setQueryData(['config'], context?.previousConfig);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    }
  });

  return {
    config,
    isLoading,
    error,
    updateConfig: updateConfig.mutate,
  };
}
