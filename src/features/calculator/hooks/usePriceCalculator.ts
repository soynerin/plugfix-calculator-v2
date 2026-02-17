import { useCallback } from 'react';
import { useConfig } from '@/features/inventory/hooks/useConfig';
import { PriceCalculator, type CalculationParams } from '@/core/services/PriceCalculator';
import type { PriceBreakdown } from '@/core/domain/models';

/**
 * Parámetros simplificados para el usuario del hook
 * Los valores de config se obtienen automáticamente
 */
export interface SimplifiedCalculationParams {
  partCost: number;
  currency: 'ARS' | 'USD';
  laborHours: number;
  riskFactor: number;
}

/**
 * Hook para calcular precios de reparación
 * Usa la configuración global y proporciona la lógica de cálculo
 */
export function usePriceCalculator() {
  const { config, isLoading } = useConfig();

  /**
   * Calcula el precio con los parámetros dados
   */
  const calculate = useCallback(
    (params: SimplifiedCalculationParams): PriceBreakdown | null => {
      if (!config) return null;

      const fullParams: CalculationParams = {
        ...params,
        hourlyRate: config.hourlyRate,
        margin: config.margin,
        usdRate: config.usdRate,
      };

      // Validar parámetros
      const validation = PriceCalculator.validateParams(fullParams);
      if (!validation.valid) {
        console.error('Parámetros inválidos:', validation.errors);
        return null;
      }

      return PriceCalculator.calculate(fullParams);
    },
    [config]
  );

  /**
   * Calcula solo el precio final (simplificado)
   */
  const calculateFinalPrice = useCallback(
    (params: SimplifiedCalculationParams): { ars: number; usd: number } | null => {
      if (!config) return null;

      const fullParams: CalculationParams = {
        ...params,
        hourlyRate: config.hourlyRate,
        margin: config.margin,
        usdRate: config.usdRate,
      };

      return PriceCalculator.calculateFinalPrice(fullParams);
    },
    [config]
  );

  return {
    calculate,
    calculateFinalPrice,
    isLoading,
    config,
  };
}
