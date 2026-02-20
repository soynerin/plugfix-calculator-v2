export interface Service {
  id: string;
  name: string;
  hours: number;
  /** Precio base de mano de obra (columna "Particular" CATEA). 0 = usa mínimo global. */
  basePrice: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
