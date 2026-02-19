export interface RepairModel {
  id: string;
  brandId: string;
  name: string;
  category?: 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium';
  releaseYear?: number; // Año de lanzamiento del dispositivo
  createdAt?: Date;
  updatedAt?: Date;
}
