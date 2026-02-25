export type RepairStatus = 'pendiente' | 'aprobado' | 'entregado';

export interface PriceBreakdown {
  partCostARS: number;
  laborCostARS: number;
  riskPremiumARS: number;
  subtotalARS: number;
  marginARS: number;
  finalPriceARS: number;
  finalPriceUSD: number;
  /** Recargo por «Extra Desarme de Riesgo» CATEA (Apple u otras marcas de alta complejidad) */
  riskChargeARS: number;
  /** true cuando se aplicó la Regla CATEA (ganancia ≥ mano de obra mínima) */
  usedCateaRule?: boolean;
  /** true cuando se aplicó el cálculo FRP (Desbloqueo de Cuenta Google) */
  usedFrpRule?: boolean;
}

/**
 * Detail for a single repair line inside a multi-repair ticket.
 * Stored as an element of `repairDetails` (JSONB array in DB).
 */
export interface RepairDetail {
  brand: string;
  model: string;
  service: string;
  partCost: number;
  currency: 'ARS' | 'USD';
  supplier?: string;
  breakdown: PriceBreakdown;
}

export interface RepairHistory {
  id: string;
  clientName?: string;
  /** Primary brand — equals first repair's brand (kept for legacy filter queries) */
  brand: string;
  /** Primary model — equals first repair's model */
  model: string;
  /** Primary service — equals first repair's service */
  service: string;
  partCost: number;
  currency: 'ARS' | 'USD';
  finalPrice: number;
  breakdown: PriceBreakdown;
  date: Date;
  notes?: string;
  status: RepairStatus;
  supplier?: string;
  /** Full list of repairs on this ticket (multi-repair support) */
  repairDetails?: RepairDetail[];
}
