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
}

export interface PriceBreakdown {
  partCostARS: number;
  laborCostARS: number;
  riskPremiumARS: number;
  subtotalARS: number;
  marginARS: number;
  finalPriceARS: number;
  finalPriceUSD: number;
}
