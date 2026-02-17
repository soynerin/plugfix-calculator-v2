import type { PriceBreakdown } from '@/core/domain/models';

/**
 * Parámetros para el cálculo de precio
 */
export interface CalculationParams {
  partCost: number;           // Costo del repuesto
  currency: 'ARS' | 'USD';    // Moneda del costo del repuesto
  laborHours: number;         // Horas de mano de obra
  hourlyRate: number;         // Tarifa por hora (ARS)
  riskFactor: number;         // Factor de riesgo del modelo (1.0 - 2.5)
  margin: number;             // Margen de ganancia (%)
  usdRate: number;            // Cotización USD
}

/**
 * PriceCalculator - Lógica pura de cálculo de precios
 * No tiene dependencias de React ni de la base de datos
 * Implementa la fórmula de negocio para calcular reparaciones
 */
export class PriceCalculator {
  /**
   * Calcula el desglose de precio completo para una reparación
   * 
   * Fórmula:
   * 1. Normalizar costo a ARS (si está en USD)
   * 2. Aplicar margen al costo del repuesto
   * 3. Calcular mano de obra con factor de riesgo
   * 4. Sumar y redondear a centena más cercana
   * 5. Convertir resultado final a USD
   */
  static calculate(params: CalculationParams): PriceBreakdown {
    const { partCost, currency, laborHours, hourlyRate, riskFactor, margin, usdRate } = params;

    // Paso 1: Normalizar costo del repuesto a ARS
    const baseCostARS = currency === 'USD' 
      ? partCost * usdRate 
      : partCost;

    // Paso 2: Aplicar margen de ganancia al costo del repuesto
    const marginMultiplier = 1 + (margin / 100);
    const partCostARS = baseCostARS * marginMultiplier;

    // Paso 3: Calcular mano de obra con factor de riesgo
    const laborCostARS = laborHours * hourlyRate * riskFactor;

    // Paso 4: Calcular prima de riesgo (se incluye en la mano de obra)
    const riskPremiumARS = laborHours * hourlyRate * (riskFactor - 1);

    // Paso 5: Subtotal (antes de redondeo)
    const subtotalARS = partCostARS + laborCostARS;

    // Paso 6: Calcular margen adicional aplicado
    const marginARS = subtotalARS - baseCostARS - (laborHours * hourlyRate);

    // Paso 7: Precio final redondeado a centena más cercana (hacia arriba)
    const finalPriceARS = Math.ceil(subtotalARS / 100) * 100;

    // Paso 8: Convertir a USD
    const finalPriceUSD = finalPriceARS / usdRate;

    return {
      partCostARS: Math.round(partCostARS),
      laborCostARS: Math.round(laborCostARS),
      riskPremiumARS: Math.round(riskPremiumARS),
      subtotalARS: Math.round(subtotalARS),
      marginARS: Math.round(marginARS),
      finalPriceARS,
      finalPriceUSD: Math.round(finalPriceUSD * 100) / 100, // 2 decimales
    };
  }

  /**
   * Calcula solo el precio final (método simplificado)
   */
  static calculateFinalPrice(params: CalculationParams): { ars: number; usd: number } {
    const breakdown = this.calculate(params);
    return {
      ars: breakdown.finalPriceARS,
      usd: breakdown.finalPriceUSD,
    };
  }

  /**
   * Valida los parámetros de cálculo
   */
  static validateParams(params: CalculationParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (params.partCost < 0) errors.push('El costo del repuesto no puede ser negativo');
    if (params.laborHours < 0) errors.push('Las horas de mano de obra no pueden ser negativas');
    if (params.hourlyRate <= 0) errors.push('La tarifa por hora debe ser mayor a 0');
    if (params.riskFactor < 1 || params.riskFactor > 3) {
      errors.push('El factor de riesgo debe estar entre 1.0 y 3.0');
    }
    if (params.margin < 0 || params.margin > 100) {
      errors.push('El margen debe estar entre 0 y 100');
    }
    if (params.usdRate <= 0) errors.push('La cotización USD debe ser mayor a 0');

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
