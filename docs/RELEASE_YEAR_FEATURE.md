# Sistema de Sugerencia Automática de Gama y Riesgo

## Resumen de Cambios

Se agregó un campo `fecha_lanzamiento` (año) a la tabla de modelos y se implementó un sistema automático de sugerencia de Gama y Factor de Riesgo basándose en la antigüedad del dispositivo.

## Archivos Modificados y Creados

### 1. **Nuevo Módulo: deviceAgeCalculator.ts**
   - **Ubicación**: `/src/core/utils/deviceAgeCalculator.ts`
   - **Propósito**: Contiene la lógica de cálculo de antigüedad y sugerencias automáticas
   
   **Funciones principales**:
   - `calculateDeviceAge(releaseYear)`: Calcula años transcurridos desde el lanzamiento
   - `getAgeDescription(ageInYears)`: Retorna descripción legible de la antigüedad
   - `suggestDeviceRiskAndCategory(releaseYear, manualCategory?)`: Sugiere automáticamente Gama y Factor de Riesgo
   - `isValidReleaseYear(year)`: Valida que el año esté en un rango razonable (2000-2027)

   **Lógica de Sugerencia**:
   - **0-2 años**: Premium, Factor 1.5-1.7 (dispositivos nuevos, piezas fáciles de conseguir)
   - **3-4 años**: Gama Alta, Factor 1.7-1.9 (piezas aún disponibles pero menos comunes)
   - **5-6 años**: Gama Media, Factor 1.9-2.2 (empiezan a escasear las piezas)
   - **7+ años**: Gama Baja, Factor 2.2-2.5 (difícil conseguir piezas, tecnología obsoleta)

### 2. **Modelo de Datos: RepairModel.ts**
   - **Ubicación**: `/src/core/domain/models/RepairModel.ts`
   - **Cambio**: Agregado campo opcional `releaseYear?: number`

### 3. **Schema de Supabase: schema.sql**
   - **Ubicación**: `/supabase/schema.sql`
   - **Cambios**:
     - Agregada columna `release_year INTEGER` con constraint CHECK (2000-2100)
     - Agregado índice `idx_models_release_year` para optimizar consultas

### 4. **Adaptador de Base de Datos: SupabaseAdapter.ts**
   - **Ubicación**: `/src/core/services/adapters/SupabaseAdapter.ts`
   - **Cambios**:
     - `addModel()`: Incluye `release_year` en inserts
     - `updateModel()`: Incluye `release_year` en updates
     - `bulkAddModels()`: Soporta `release_year` en importaciones masivas
     - `mapModelFromDB()`: Mapea `release_year` desde la base de datos

### 5. **Componente de UI: ModelManager.tsx**
   - **Ubicación**: `/src/features/inventory/components/ModelManager.tsx`
   - **Cambios principales**:
     - **Formulario de Agregar**: Campo de año con ícono de calendario
     - **Modal de Edición**: Campo de año con validación
     - **Tarjetas de Modelo**: Badge mostrando año y antigüedad
     - **Auto-sugerencia**: useEffect que actualiza Gama y Riesgo al ingresar año
     - **Búsqueda**: Incluye año en el filtro de búsqueda
     - **Bulk Import**: Soporta `añoLanzamiento` o `releaseYear` en JSON

### 6. **Migración SQL**
   - **Ubicación**: `/supabase/migrations/20260217_add_release_year.sql`
   - **Propósito**: Script para actualizar bases de datos existentes
   - **Contenido**:
     ```sql
     ALTER TABLE models ADD COLUMN release_year INTEGER 
     CHECK (release_year >= 2000 AND release_year <= 2100);
     
     CREATE INDEX idx_models_release_year ON models(release_year);
     ```

## Cómo Usar

### 1. **Aplicar la migración a tu base de datos**
   En el dashboard de Supabase, ejecuta el contenido de:
   ```
   /supabase/migrations/20260217_add_release_year.sql
   ```

### 2. **Agregar un nuevo modelo con año**
   - Ve a la sección de Modelos
   - Completa el formulario con Marca y Nombre
   - **Ingresa el Año de Lanzamiento** (opcional)
   - El sistema **sugerirá automáticamente** la Gama y Factor de Riesgo
   - Puedes ajustar manualmente si lo deseas
   - Haz clic en "Agregar Modelo"

### 3. **Editar modelo existente**
   - Haz clic en el ícono de lápiz en una tarjeta de modelo
   - Agrega o modifica el año de lanzamiento
   - Los campos se actualizarán automáticamente

### 4. **Importación masiva con años**
   Ejemplo de JSON:
   ```json
   [
     {
       "nombre": "Galaxy S23",
       "marca": "Samsung",
       "añoLanzamiento": 2023,
       "categoria": "Premium",
       "factorRiesgo": 1.5
     },
     {
       "nombre": "iPhone 11",
       "marca": "Apple",
       "añoLanzamiento": 2019
       // categoria y factorRiesgo se sugieren automáticamente
     }
   ]
   ```

## Visualización en Tarjetas

Cada modelo ahora muestra:
1. **Badge de Riesgo** (ámbar): Factor de riesgo con ícono de alerta
2. **Badge de Categoría** (color por gama): Gama Baja/Media/Alta/Premium
3. **Badge de Año** (azul con calendario): "2023 • 3 años (Reciente)"

## Beneficios

✅ **Automatización**: Reduce errores manuales al sugerir valores basados en antigüedad
✅ **Consistencia**: Criterios uniformes para todos los dispositivos
✅ **Transparencia**: Muestra la antigüedad del dispositivo visualmente
✅ **Flexibilidad**: El campo es opcional y las sugerencias pueden sobrescribirse
✅ **Búsqueda mejorada**: Puedes buscar modelos por año de lanzamiento

## Compatibilidad

- ✅ **Retrocompatible**: Modelos sin año funcionan normalmente
- ✅ **Campo opcional**: No es obligatorio ingresar el año
- ✅ **Validación**: Años válidos desde 2000 hasta 2027
- ✅ **Sugerencias inteligentes**: Considera tanto el año como la categoría manual

## Próximos pasos recomendados

1. Aplicar la migración SQL en producción
2. Actualizar modelos existentes agregando años gradualmente
3. Considerar agregar campo de "fecha de descontinuación" en el futuro
4. Implementar reportes de antigüedad de inventario
