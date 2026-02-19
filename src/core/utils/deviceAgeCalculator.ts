/**
 * Utilidades para calcular la antigüedad de dispositivos y sugerir
 * automáticamente la Gama y el Factor de Riesgo
 */

export type DeviceCategory = 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium';

export interface DeviceSuggestion {
  category: DeviceCategory;
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

  // Si se proporciona categoría manual, solo devolvemos la categoría con edad
  if (manualCategory) {
    return {
      category: manualCategory,
      ageInYears,
      ageDescription,
    };
  }

  // Sugerencia automática basada en antigüedad
  let category: DeviceCategory;

  if (ageInYears < 0) {
    category = 'Premium';
  } else if (ageInYears <= 2) {
    category = 'Premium';
  } else if (ageInYears <= 4) {
    category = 'Gama Alta';
  } else if (ageInYears <= 6) {
    category = 'Gama Media';
  } else {
    category = 'Gama Baja';
  }

  return {
    category,
    ageInYears,
    ageDescription,
  };
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
