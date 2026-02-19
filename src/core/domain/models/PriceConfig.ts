export interface TierMultipliers {
  premium: number;
  alta: number;
  media: number;
  baja: number;
}

export interface BrandMultipliers {
  apple: number;
  samsung: number;
  motorola: number;
  xiaomi: number;
  otros: number;
}

export interface PartMultipliers {
  microelectronica: number;
  pantalla: number;
  pin_carga: number;
  bateria: number;
}

export interface PriceConfig {
  /** user_id del dueño (cada taller tiene su propia fila) */
  id: string;
  hourlyRate: number;           // Tarifa por hora (ARS)
  margin: number;               // Margen de ganancia (%)
  usdRate: number;              // Cotización USD (puede actualizarse desde API)
  tierMultipliers: TierMultipliers;
  brandMultipliers: BrandMultipliers;
  partMultipliers: PartMultipliers;
  updatedAt?: Date;
}

/** Valores por defecto que se asignan cuando el usuario es nuevo */
export const DEFAULT_CONFIG: Omit<PriceConfig, 'id'> = {
  hourlyRate: 13000,
  margin: 40,
  usdRate: 1200,
  tierMultipliers:  { premium: 2.0, alta: 1.5, media: 1.2, baja: 1.0 },
  brandMultipliers: { apple: 1.3, samsung: 1.2, motorola: 1.0, xiaomi: 1.0, otros: 1.0 },
  partMultipliers:  { microelectronica: 2.0, pantalla: 1.5, pin_carga: 1.2, bateria: 1.0 },
};
