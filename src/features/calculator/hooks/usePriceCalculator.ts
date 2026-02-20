import { useCallback } from 'react';
import { useConfig } from '@/features/inventory/hooks/useConfig';
import { PriceCalculator, type CalculationParams } from '@/core/services/PriceCalculator';
import type { PriceBreakdown } from '@/core/domain/models';

/**
 * Parámetros simplificados para el usuario del hook.
 * Los valores de config (usdRate, defaultMargin, etc.) se inyectan automáticamente.
 */
export interface SimplifiedCalculationParams {
  partCost: number;
  currency: 'ARS' | 'USD';
  /** true cuando el servicio seleccionado es un cambio de módulo/pantalla */
  isModuleService?: boolean;
  /** true cuando el servicio es FRP / Cuenta Google */
  isFrpService?: boolean;
  /** Multiplicador por nivel de seguridad para FRP (1=Baja, 2=Media, 3=Alta) */
  frpSecurityMultiplier?: 1 | 2 | 3;
}

export function usePriceCalculator() {
  const { config, isLoading } = useConfig();

  const calculate = useCallback(
    (params: SimplifiedCalculationParams): PriceBreakdown | null => {
      if (!config) return null;

      const fullParams: CalculationParams = {
        partCost: params.partCost,
        currency: params.currency,
        usdRate: config.usdRate,
        defaultMargin: config.defaultMargin,
        minimumLaborCost: config.minimumLaborCost,
        applyCateaModuleRule: config.applyCateaModuleRule,
        isModuleService: params.isModuleService ?? false,
        isFrpService: params.isFrpService ?? false,
        frpSecurityMultiplier: params.frpSecurityMultiplier,
      };

      const validation = PriceCalculator.validateParams(fullParams);
      if (!validation.valid) {
        console.error('Parámetros inválidos:', validation.errors);
        return null;
      }

      return PriceCalculator.calculate(fullParams);
    },
    [config]
  );

  const calculateFinalPrice = useCallback(
    (params: SimplifiedCalculationParams): { ars: number; usd: number } | null => {
      if (!config) return null;

      const fullParams: CalculationParams = {
        partCost: params.partCost,
        currency: params.currency,
        usdRate: config.usdRate,
        defaultMargin: config.defaultMargin,
        minimumLaborCost: config.minimumLaborCost,
        applyCateaModuleRule: config.applyCateaModuleRule,
        isModuleService: params.isModuleService ?? false,
        isFrpService: params.isFrpService ?? false,
        frpSecurityMultiplier: params.frpSecurityMultiplier,
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
