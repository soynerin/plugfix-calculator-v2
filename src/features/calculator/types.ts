export interface RepairGroup {
  id: string;
  modelId: string;
  serviceId: string;
  partTypeId: string;
  partCost: string;
  currency: 'ARS' | 'USD';
  supplier: string;
  frpSecurityMultiplier: 1 | 2 | 3;
}
