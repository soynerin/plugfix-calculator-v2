export interface PriceConfig {
  /** user_id del dueño (cada taller tiene su propia fila) */
  id: string;
  hourlyRate: number;      // Tarifa por hora (ARS)
  margin: number;          // Margen de ganancia (%)
  usdRate: number;         // Cotización USD (puede actualizarse desde API)
  updatedAt?: Date;
}

/** Valores por defecto que se asignan cuando el usuario es nuevo */
export const DEFAULT_CONFIG: Omit<PriceConfig, 'id'> = {
  hourlyRate: 13000,
  margin: 40,
  usdRate: 1200,
};
