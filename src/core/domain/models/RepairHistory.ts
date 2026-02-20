export type RepairStatus = 'pendiente' | 'aprobado' | 'entregado';

export interface RepairHistory {
  id: string;
  clientName?: string;
  brand: string;
  model: string;
  service: string;
  partCost: number;
  currency: 'ARS' | 'USD';
  finalPrice: number;
  breakdown: PriceBreakdown;
  date: Date;
  notes?: string;
  status: RepairStatus;
  supplier?: string;
}

export interface PriceBreakdown {
  partCostARS: number;
  laborCostARS: number;
  riskPremiumARS: number;
  subtotalARS: number;
  marginARS: number;
  finalPriceARS: number;
  finalPriceUSD: number;
  /** true cuando se aplicó la Regla CATEA (ganancia ≥ mano de obra mínima) */
  usedCateaRule?: boolean;
  /** true cuando se aplicó el cálculo FRP (Desbloqueo de Cuenta Google) */
  usedFrpRule?: boolean;
}
