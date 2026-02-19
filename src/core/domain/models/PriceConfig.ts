export interface PriceConfig {
  /** user_id del dueño (cada taller tiene su propia fila) */
  id: string;
  usdRate: number;                // Cotización USD → ARS (actualizable desde API)
  defaultMargin: number;          // Margen general sobre repuestos (%)
  minimumLaborCost: number;       // Costo mínimo de mano de obra (ARS)
  applyCateaModuleRule: boolean;  // Regla CATEA para cambios de módulo/pantalla
  updatedAt?: Date;
}

/** Valores por defecto asignados a usuarios nuevos */
export const DEFAULT_CONFIG: Omit<PriceConfig, 'id'> = {
  usdRate: 1200,
  defaultMargin: 80,
  minimumLaborCost: 15000,
  applyCateaModuleRule: false,
};
