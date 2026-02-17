export interface RepairModel {
  id: string;
  brandId: string;
  name: string;
  riskFactor: number; // 1.0 - 2.5
  category?: 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium';
  createdAt?: Date;
  updatedAt?: Date;
}
