export interface PriceConfig {
  id: 'main'; // Singleton
  hourlyRate: number;      // Tarifa por hora (ARS)
  margin: number;          // Margen de ganancia (%)
  usdRate: number;         // Cotización USD (puede actualizarse desde API)
  updatedAt?: Date;
}
