import { useQuery } from '@tanstack/react-query';

interface DolarBlueResponse {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

/**
 * Función para obtener la cotización del Dólar Blue desde DolarApi
 */
const fetchDolarBlue = async (): Promise<DolarBlueResponse> => {
  const response = await fetch('https://dolarapi.com/v1/dolares/blue');
  if (!response.ok) {
    throw new Error('Error al obtener cotización del Dólar Blue');
  }
  return response.json();
};

/**
 * Hook para obtener cotización del Dólar Blue
 * Configurado con enabled: false para ejecutarse solo manualmente
 */
export function useDolarBlue() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['dolarBlue'],
    queryFn: fetchDolarBlue,
    enabled: false, // No se ejecuta automáticamente
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    retry: 2, // Reintentar 2 veces en caso de error
  });

  return {
    data,
    isLoading: isLoading || isRefetching,
    error,
    refetch,
    venta: data?.venta,
  };
}
