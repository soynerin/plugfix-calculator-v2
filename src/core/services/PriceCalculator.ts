import type { PriceBreakdown } from '@/core/domain/models';

/**
 * Parámetros para el cálculo de precio (modelo CATEA v2.0)
 */
export interface CalculationParams {
  partCost: number;                // Costo del repuesto (en `currency`)
  currency: 'ARS' | 'USD';        // Moneda del costo del repuesto
  usdRate: number;                 // Cotización USD → ARS
  defaultMargin: number;           // Margen general sobre repuestos (%)
  minimumLaborCost: number;        // Costo mínimo de mano de obra global (ARS) — fallback
  /** Precio base de M.O. propio del servicio (columna "Particular" CATEA). 0 usa el fallback. */
  serviceBasePrice: number;
  applyCateaModuleRule: boolean;   // ¿Activar regla CATEA?
  isModuleService: boolean;        // ¿El servicio es cambio de módulo/pantalla?
  isFrpService?: boolean;          // ¿El servicio es FRP / Cuenta Google?
  frpSecurityMultiplier?: 1 | 2 | 3; // Multiplicador por nivel de seguridad FRP
}

/**
 * PriceCalculator — Lógica pura de cálculo de precios (modelo CATEA v2.0)
 *
 * Fórmula estándar:
 *   PrecioFinal = ceil((RepuestoARS × (1 + margen%) + servicioBasePrice) / 1000) × 1000
 *
 * Fórmula CATEA (pantallas/módulos con regla activada):
 *   profit = (RepuestoARS × 2 × 1.10) − RepuestoARS
 *   Si profit > servicioBasePrice → usa precio CATEA
 *   Si profit <= servicioBasePrice → usa servicioBasePrice como M.O.
 */
export class PriceCalculator {
  static calculate(params: CalculationParams): PriceBreakdown {
    const {
      partCost, currency, usdRate,
      defaultMargin, minimumLaborCost, serviceBasePrice,
      isModuleService,
    } = params;

    // Precio base efectivo: el del servicio si está definido, sino fallback al global
    const effectiveBasePrice = serviceBasePrice > 0 ? serviceBasePrice : minimumLaborCost;

    // Normalizar costo del repuesto a ARS
    const rawPartARS = currency === 'USD' ? partCost * usdRate : partCost;

    if (isModuleService) {
      // --- Fórmula CATEA: profit = (RepuestoARS × 2 × 1.10) − RepuestoARS ---
      const cateaSuggestedPrice = rawPartARS * 2 * 1.10;
      const gainResultante = cateaSuggestedPrice - rawPartARS; // rawPartARS × 1.20

      if (gainResultante > effectiveBasePrice) {
        // La ganancia CATEA supera la M.O. base → aplicar Regla CATEA
        const finalPriceARS = Math.ceil(cateaSuggestedPrice / 1000) * 1000;
        return {
          partCostARS:    Math.round(rawPartARS),
          laborCostARS:   Math.round(gainResultante),
          riskPremiumARS: 0,
          subtotalARS:    Math.round(cateaSuggestedPrice),
          marginARS:      0,
          finalPriceARS,
          finalPriceUSD:  Math.round((finalPriceARS / usdRate) * 100) / 100,
          usedCateaRule:  true,
        };
      }

      // Fallback: la ganancia CATEA es insuficiente → cobrar M.O. base del servicio
      const subtotalFallbackARS = rawPartARS + effectiveBasePrice;
      const finalPriceFallbackARS = Math.ceil(subtotalFallbackARS / 1000) * 1000;
      return {
        partCostARS:    Math.round(rawPartARS),
        laborCostARS:   Math.round(effectiveBasePrice),
        riskPremiumARS: 0,
        subtotalARS:    Math.round(subtotalFallbackARS),
        marginARS:      0,
        finalPriceARS:  finalPriceFallbackARS,
        finalPriceUSD:  Math.round((finalPriceFallbackARS / usdRate) * 100) / 100,
        usedCateaRule:  false,
      };
    }

    // --- Fórmula FRP (Desbloqueo de Cuenta Google / Factory Reset Protection) ---
    if (params.isFrpService) {
      const multiplier = params.frpSecurityMultiplier ?? 1;
      const frpTotal = effectiveBasePrice * multiplier;
      const finalPriceARS = Math.ceil(frpTotal / 1000) * 1000;
      return {
        partCostARS:    0,
        laborCostARS:   Math.round(frpTotal),
        riskPremiumARS: 0,
        subtotalARS:    Math.round(frpTotal),
        marginARS:      0,
        finalPriceARS,
        finalPriceUSD:  Math.round((finalPriceARS / usdRate) * 100) / 100,
        usedCateaRule:  false,
        usedFrpRule:    true,
      };
    }

    // --- Fórmula estándar ---
    const marginARS          = rawPartARS * (defaultMargin / 100);
    const partWithMarginARS  = rawPartARS + marginARS;
    const laborCostARS       = effectiveBasePrice;
    const subtotalARS        = partWithMarginARS + laborCostARS;
    const finalPriceARS      = Math.ceil(subtotalARS / 1000) * 1000;

    return {
      partCostARS:    Math.round(rawPartARS),
      laborCostARS:   Math.round(laborCostARS),
      riskPremiumARS: 0,
      subtotalARS:    Math.round(subtotalARS),
      marginARS:      Math.round(marginARS),
      finalPriceARS,
      finalPriceUSD:  Math.round((finalPriceARS / usdRate) * 100) / 100,
      usedCateaRule:  false,
    };
  }

  static calculateFinalPrice(params: CalculationParams): { ars: number; usd: number } {
    const breakdown = this.calculate(params);
    return { ars: breakdown.finalPriceARS, usd: breakdown.finalPriceUSD };
  }

  /**
   * Determina si el nombre de un servicio corresponde a un cambio de módulo/pantalla.
   * Usa normalización NFD para ignorar tildes y es insensible a mayúsculas.
   * FUENTE ÚNICA DE VERDAD — usar siempre este método en lugar de regex inline.
   */
  static isModuleService(serviceName: string): boolean {
    const normalized = serviceName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return normalized.includes('modulo') || normalized.includes('pantalla') || normalized.includes('screen');
  }

  /**
   * Determina si el nombre de un servicio corresponde a FRP / Cuenta Google.
   * FUENTE ÚNICA DE VERDAD para la detección de FRP.
   */
  static isFrpService(serviceName: string): boolean {
    const lower = serviceName.toLowerCase();
    return lower.includes('frp') || lower.includes('cuenta de google') || lower.includes('cuenta google');
  }

  static validateParams(params: CalculationParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (params.partCost < 0)          errors.push('El costo del repuesto no puede ser negativo');
    if (params.usdRate <= 0)          errors.push('La cotización USD debe ser mayor a 0');
    if (params.defaultMargin < 0 || params.defaultMargin > 500)
                                      errors.push('El margen debe estar entre 0% y 500%');
    if (params.minimumLaborCost < 0)  errors.push('La mano de obra mínima no puede ser negativa');
    if (params.serviceBasePrice < 0)  errors.push('El precio base del servicio no puede ser negativo');
    return { valid: errors.length === 0, errors };
  }
}
