/**
 * Utilidades para calcular la antigüedad de dispositivos y sugerir
 * automáticamente la Gama y el Factor de Riesgo
 */

export type DeviceCategory = 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium';

export interface DeviceSuggestion {
  category: DeviceCategory;
  riskFactor: number;
  ageInYears: number;
  ageDescription: string;
}

/**
 * Calcula la antigüedad del dispositivo en años
 * @param releaseYear - Año de lanzamiento del dispositivo
 * @returns Años transcurridos desde el lanzamiento
 */
export function calculateDeviceAge(releaseYear: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear - releaseYear;
}

/**
 * Obtiene una descripción textual de la antigüedad
 * @param ageInYears - Años de antigüedad
 * @returns Descripción legible de la antigüedad
 */
export function getAgeDescription(ageInYears: number): string {
  if (ageInYears < 0) return 'Año futuro';
  if (ageInYears === 0) return 'Lanzamiento este año';
  if (ageInYears === 1) return '1 año';
  if (ageInYears <= 2) return `${ageInYears} años (Nuevo)`;
  if (ageInYears <= 4) return `${ageInYears} años (Reciente)`;
  if (ageInYears <= 6) return `${ageInYears} años (Antiguo)`;
  return `${ageInYears} años (Muy antiguo)`;
}

/**
 * Sugiere automáticamente la Gama y el Factor de Riesgo basándose
 * en la antigüedad del dispositivo
 * 
 * Lógica:
 * - 0-2 años: Premium/Gama Alta, bajo riesgo (piezas disponibles)
 * - 3-4 años: Gama Media, riesgo medio (piezas menos comunes)
 * - 5-6 años: Gama Baja, riesgo alto (escasez de piezas)
 * - 7+ años: Gama Baja, muy alto riesgo (difícil conseguir piezas)
 * 
 * @param releaseYear - Año de lanzamiento del dispositivo
 * @param manualCategory - Categoría manual si se desea sobrescribir
 * @returns Sugerencia de categoría y factor de riesgo
 */
export function suggestDeviceRiskAndCategory(
  releaseYear: number,
  manualCategory?: DeviceCategory
): DeviceSuggestion {
  const ageInYears = calculateDeviceAge(releaseYear);
  const ageDescription = getAgeDescription(ageInYears);

  // Si se proporciona categoría manual, calcular riesgo basado en antigüedad
  if (manualCategory) {
    let baseFactor = getCategoryBaseFactor(manualCategory);
    let ageFactor = calculateAgeFactor(ageInYears);
    let riskFactor = Math.min(2.5, Math.max(1.0, baseFactor + ageFactor));
    
    return {
      category: manualCategory,
      riskFactor: Math.round(riskFactor * 10) / 10,
      ageInYears,
      ageDescription,
    };
  }

  // Sugerencia automática basada en antigüedad
  let category: DeviceCategory;
  let riskFactor: number;

  if (ageInYears < 0) {
    // Año futuro - probablemente un error
    category = 'Premium';
    riskFactor = 1.5;
  } else if (ageInYears <= 2) {
    // Dispositivos nuevos - Premium con bajo riesgo
    // Piezas fáciles de conseguir, dispositivos actuales
    category = 'Premium';
    riskFactor = 1.5 + (ageInYears * 0.1);
  } else if (ageInYears <= 4) {
    // Dispositivos recientes - Gama Alta con riesgo moderado
    // Piezas aún disponibles pero menos comunes
    category = 'Gama Alta';
    riskFactor = 1.7 + ((ageInYears - 2) * 0.1);
  } else if (ageInYears <= 6) {
    // Dispositivos antiguos - Gama Media con riesgo medio-alto
    // Empiezan a escasear las piezas
    category = 'Gama Media';
    riskFactor = 1.9 + ((ageInYears - 4) * 0.15);
  } else {
    // Dispositivos muy antiguos - Gama Baja con alto riesgo
    // Difícil conseguir piezas, tecnología obsoleta
    category = 'Gama Baja';
    riskFactor = 2.2 + (Math.min(ageInYears - 6, 2) * 0.15);
  }

  // Asegurar que el factor de riesgo esté dentro del rango permitido [1.0, 2.5]
  riskFactor = Math.min(2.5, Math.max(1.0, riskFactor));
  // Redondear a 1 decimal
  riskFactor = Math.round(riskFactor * 10) / 10;

  return {
    category,
    riskFactor,
    ageInYears,
    ageDescription,
  };
}

/**
 * Obtiene el factor base según la categoría
 */
function getCategoryBaseFactor(category: DeviceCategory): number {
  const baseFactors: Record<DeviceCategory, number> = {
    'Gama Baja': 1.1,
    'Gama Media': 1.4,
    'Gama Alta': 1.7,
    'Premium': 2.0,
  };
  return baseFactors[category];
}

/**
 * Calcula el factor adicional por antigüedad
 */
function calculateAgeFactor(ageInYears: number): number {
  if (ageInYears <= 2) return 0;
  if (ageInYears <= 4) return 0.2;
  if (ageInYears <= 6) return 0.4;
  return 0.6;
}

/**
 * Valida que un año sea razonable para un dispositivo
 * @param year - Año a validar
 * @returns true si el año es válido
 */
export function isValidReleaseYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  const minYear = 2000; // Consideramos dispositivos desde el año 2000
  const maxYear = currentYear + 1; // Permitimos 1 año en el futuro
  
  return year >= minYear && year <= maxYear;
}
