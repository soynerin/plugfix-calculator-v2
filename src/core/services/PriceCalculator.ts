import type { PriceBreakdown } from '@/core/domain/models';

/**
 * Parámetros para el cálculo de precio (modelo CATEA v2.0)
 */
export interface CalculationParams {
  partCost: number;                // Costo del repuesto (en `currency`)
  currency: 'ARS' | 'USD';        // Moneda del costo del repuesto
  usdRate: number;                 // Cotización USD → ARS
  defaultMargin: number;           // Margen general sobre repuestos (%)
  minimumLaborCost: number;        // Costo mínimo de mano de obra (ARS)
  applyCateaModuleRule: boolean;   // ¿Activar regla CATEA?
  isModuleService: boolean;        // ¿El servicio es cambio de módulo/pantalla?
}

/**
 * PriceCalculator — Lógica pura de cálculo de precios (modelo CATEA v2.0)
 *
 * Fórmula estándar:
 *   PrecioFinal = ceil((RepuestoARS × (1 + margen%) + ManoDeObraMínima) / 100) × 100
 *
 * Fórmula CATEA (pantallas/módulos con regla activada):
 *   PrecioFinal = ceil((RepuestoARS × 2 × 1.10) / 100) × 100
 */
export class PriceCalculator {
  static calculate(params: CalculationParams): PriceBreakdown {
    const {
      partCost, currency, usdRate,
      defaultMargin, minimumLaborCost,
      applyCateaModuleRule, isModuleService,
    } = params;

    // Normalizar costo del repuesto a ARS
    const rawPartARS = currency === 'USD' ? partCost * usdRate : partCost;

    if (applyCateaModuleRule && isModuleService) {
      // --- Fórmula CATEA: (RepuestoARS × 2) + 10% margen de seguridad ---
      // El doble del costo cubre: 1× repuesto + 1× mano de obra especializada
      // El 10% adicional es el margen de seguridad recomendado por CATEA
      const laborCostARS   = rawPartARS;                    // 1× (labor = costo pieza)
      const riskPremiumARS = rawPartARS * 2 * 0.10;         // 10% sobre el total × 2
      const subtotalARS    = rawPartARS * 2 * 1.10;
      const finalPriceARS  = Math.ceil(subtotalARS / 100) * 100;

      return {
        partCostARS:   Math.round(rawPartARS),
        laborCostARS:  Math.round(laborCostARS),
        riskPremiumARS: Math.round(riskPremiumARS),
        subtotalARS:   Math.round(subtotalARS),
        marginARS:     0,
        finalPriceARS,
        finalPriceUSD: Math.round((finalPriceARS / usdRate) * 100) / 100,
      };
    }

    // --- Fórmula estándar ---
    const marginARS          = rawPartARS * (defaultMargin / 100);
    const partWithMarginARS  = rawPartARS + marginARS;
    const laborCostARS       = minimumLaborCost;
    const subtotalARS        = partWithMarginARS + laborCostARS;
    const finalPriceARS      = Math.ceil(subtotalARS / 100) * 100;

    return {
      partCostARS:    Math.round(rawPartARS),
      laborCostARS:   Math.round(laborCostARS),
      riskPremiumARS: 0,
      subtotalARS:    Math.round(subtotalARS),
      marginARS:      Math.round(marginARS),
      finalPriceARS,
      finalPriceUSD: Math.round((finalPriceARS / usdRate) * 100) / 100,
    };
  }

  static calculateFinalPrice(params: CalculationParams): { ars: number; usd: number } {
    const breakdown = this.calculate(params);
    return { ars: breakdown.finalPriceARS, usd: breakdown.finalPriceUSD };
  }

  static validateParams(params: CalculationParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (params.partCost < 0)          errors.push('El costo del repuesto no puede ser negativo');
    if (params.usdRate <= 0)          errors.push('La cotización USD debe ser mayor a 0');
    if (params.defaultMargin < 0 || params.defaultMargin > 500)
                                      errors.push('El margen debe estar entre 0% y 500%');
    if (params.minimumLaborCost < 0)  errors.push('La mano de obra mínima no puede ser negativa');
    return { valid: errors.length === 0, errors };
  }
}
