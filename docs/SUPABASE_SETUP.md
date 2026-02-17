# 🚀 Guía de Configuración de Supabase - PlugFix Calculator v2

Esta guía te ayudará a configurar Supabase como backend en la nube para PlugFix Calculator v2.

## 📋 Índice

1. [Prerrequisitos](#prerrequisitos)
2. [Crear Proyecto en Supabase](#1-crear-proyecto-en-supabase)
3. [Configurar Base de Datos](#2-configurar-base-de-datos)
4. [Obtener Credenciales](#3-obtener-credenciales)
5. [Configurar Variables de Entorno](#4-configurar-variables-de-entorno)
6. [Migrar Datos Existentes](#5-migrar-datos-existentes-opcional)
7. [Verificar Instalación](#6-verificar-instalación)
8. [Solución de Problemas](#solución-de-problemas)

---

## Prerrequisitos

- ✅ Node.js 18+ instalado
- ✅ Cuenta gratuita en [Supabase](https://supabase.com)
- ✅ Proyecto PlugFix Calculator v2 clonado y funcionando

---

## 1. Crear Proyecto en Supabase

### Paso 1.1: Crear Cuenta
1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en **"Start your project"** o **"Sign Up"**
3. Regístrate con:
   - GitHub (recomendado)
   - Google
   - Email/Password

### Paso 1.2: Crear Nuevo Proyecto
1. Una vez logueado, haz clic en **"New Project"**
2. Completa los datos:
   - **Name**: `plugfix-calculator` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura (guárdala, la necesitarás)
   - **Region**: Selecciona la más cercana (ej: `South America (São Paulo)` o `US East`)
   - **Pricing Plan**: **Free** (0 USD/mes, suficiente para desarrollo)

3. Haz clic en **"Create new project"**
4. ⏳ Espera 2-3 minutos mientras Supabase crea tu proyecto

---

## 2. Configurar Base de Datos

### Paso 2.1: Abrir SQL Editor
1. En el menú lateral izquierdo, haz clic en **"SQL Editor"**
2. Haz clic en **"New query"**

### Paso 2.2: Ejecutar Schema SQL
1. Abre el archivo `supabase/schema.sql` de este repositorio
2. Copia **TODO** el contenido del archivo
3. Pégalo en el editor SQL de Supabase
4. Haz clic en **"Run"** (o presiona `Ctrl/Cmd + Enter`)

**¿Qué hace este script?**
- ✅ Crea 5 tablas: `brands`, `models`, `services`, `config`, `history`
- ✅ Define índices para búsquedas rápidas
- ✅ Configura Row Level Security (RLS) con políticas públicas
- ✅ Agrega triggers para `updated_at` automático
- ✅ Inserta datos iniciales (Samsung, Apple, 3 servicios, configuración)
- ✅ Crea funciones auxiliares de búsqueda

### Paso 2.3: Verificar Creación
1. Ve a **"Table Editor"** en el menú lateral
2. Deberías ver las 5 tablas: `brands`, `models`, `services`, `config`, `history`
3. Haz clic en `brands` → deberías ver Samsung y Apple pre-cargados

---

## 3. Obtener Credenciales

### Paso 3.1: Ir a Settings
1. En el menú lateral, haz clic en **"Settings"** (⚙️ engranaje)
2. Haz clic en **"API"**

### Paso 3.2: Copiar Credenciales
Necesitas **2 valores** (están en la sección "Project API keys"):

1. **Project URL** (VITE_SUPABASE_URL):
   ```
   https://xxxxxxxxxxx.supabase.co
   ```
   
2. **anon public** key (VITE_SUPABASE_ANON_KEY):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
   ```

⚠️ **IMPORTANTE**: No compartas la `service_role` key (es una clave secreta). Solo usa la `anon` key.

---

## 4. Configurar Variables de Entorno

### Paso 4.1: Editar .env.local
1. Abre el archivo `.env.local` en la raíz del proyecto
2. Actualiza las siguientes variables:

```bash
# Cambiar de 'dexie' a 'supabase'
VITE_DB_PROVIDER=supabase

# Pegar las credenciales obtenidas en el paso 3
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

### Paso 4.2: Guardar y Reiniciar
1. Guarda el archivo `.env.local`
2. **Reinicia el servidor de desarrollo**:
   ```bash
   # Ctrl+C para detener
   npm run dev
   ```

---

## 5. Migrar Datos Existentes (Opcional)

Si ya tienes datos en IndexedDB (Dexie) y quieres migrarlos a Supabase:

### Opción A: Usar MigrationService (programáticamente)

```typescript
import { MigrationService } from '@/core/services';

const migration = new MigrationService((progress) => {
  console.log(`${progress.step} - ${progress.percentage}%`);
});

const result = await migration.migrateToSupabase();

if (result.success) {
  console.log('✅ Migración exitosa:', result.stats);
} else {
  console.error('❌ Errores:', result.errors);
}
```

### Opción B: Exportar/Importar Manualmente

1. **Exportar desde Dexie**:
   - Ve a la pestaña "History" en la app
   - Haz clic en "Export" → JSON
   - Guarda el archivo `history.json`

2. **Importar a Supabase**:
   - Cambia `VITE_DB_PROVIDER=supabase` en `.env.local`
   - Usa el método `restore()` del adapter:
   ```typescript
   const file = new File([jsonData], 'backup.json');
   await migration.restoreFromBackup(file);
   ```

### Verificar Migración

```typescript
const verification = await migration.verifyMigration();

console.log('Dexie:', verification.dexieCount);
console.log('Supabase:', verification.supabaseCount);
console.log('¿Migración válida?', verification.isValid);
```

---

## 6. Verificar Instalación

### Método 1: Usar el Componente de Diagnóstico (Recomendado)

La forma más fácil es usar el componente visual integrado en la aplicación:

1. **Ejecuta el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

2. **Abre la aplicación** en tu navegador (http://localhost:5173)

3. **Ve a la pestaña "⚙️ Config"**

4. **Haz clic en "Ejecutar Diagnóstico"** en la tarjeta "Diagnóstico de Base de Datos"

El diagnóstico te mostrará:
- ✅ Qué base de datos estás usando (Dexie o Supabase)
- ✅ Estado de conexión a Supabase (si aplica)
- ✅ Cuántas marcas hay en la base de datos
- ✅ URL de Supabase configurada
- ❌ Errores si los hay

### Método 2: Prueba Programática

### Prueba 1: Conexión
Abre la consola del navegador (F12) y ejecuta:

```javascript
import { checkSupabaseConnection } from '@/lib/supabase';

const isConnected = await checkSupabaseConnection();
console.log('Conectado a Supabase:', isConnected); // debe ser true
```

### Prueba 2: Obtener Datos
En cualquier componente:

```typescript
import { useBrands } from '@/features/inventory/hooks/useBrands';

function TestComponent() {
  const { data: brands, isLoading } = useBrands();
  
  if (isLoading) return <div>Cargando...</div>;
  
  return (
    <div>
      <h2>Marcas desde Supabase:</h2>
      <ul>
        {brands?.map(b => <li key={b.id}>{b.name}</li>)}
      </ul>
    </div>
  );
}
```

### Prueba 3: Insertar Datos
1. Ve a la pestaña "Brands" en la app
2. Agrega una nueva marca (ej: "Motorola")
3. Ve a Supabase → Table Editor → `brands`
4. Deberías ver "Motorola" en la tabla

---

## Solución de Problemas

### Error: "Supabase credentials not found"

**Causa**: Las variables de entorno no están configuradas correctamente.

**Solución**:
1. Verifica que `.env.local` exista en la raíz del proyecto
2. Confirma que las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén completas
3. Reinicia el servidor de desarrollo (`npm run dev`)

---

### Error: "Failed to fetch brands: relation does not exist"

**Causa**: El schema SQL no se ejecutó correctamente.

**Solución**:
1. Ve a Supabase → SQL Editor
2. Ejecuta nuevamente el script `supabase/schema.sql`
3. Verifica en Table Editor que las 5 tablas existan

---

### Error: "No rows returned" o "Empty array"

**Causa**: Las tablas están vacías (no se cargaron los datos iniciales).

**Solución**:
1. Ve a Supabase → SQL Editor
2. Ejecuta solo la sección "SEED DATA" del script:

```sql
INSERT INTO brands (id, name) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Samsung'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Apple')
ON CONFLICT (name) DO NOTHING;

INSERT INTO services (id, name, hours) VALUES
  ('660e8400-e29b-41d4-a716-446655440000', 'Cambio de Pantalla', 1.0),
  ('660e8400-e29b-41d4-a716-446655440001', 'Cambio de Batería', 0.5),
  ('660e8400-e29b-41d4-a716-446655440002', 'Conector de Carga', 0.75)
ON CONFLICT (name) DO NOTHING;

INSERT INTO config (id, hourly_rate, margin, usd_rate)
VALUES ('main', 13000, 40, 1200)
ON CONFLICT (id) DO NOTHING;
```

---

### Error: "RLS policy violation" o "Insufficient privileges"

**Causa**: Row Level Security (RLS) está bloqueando las consultas.

**Solución (Desarrollo)**:
1. Ve a Supabase → Authentication → Policies
2. Para cada tabla (`brands`, `models`, `services`, `config`, `history`):
   - Verifica que existan políticas con "Allow public access"
   - Si no existen, ejecuta el script SQL completo nuevamente

**Solución (Producción)**:
- Para producción, considera implementar autenticación Supabase Auth
- Las políticas RLS deben modificarse para requerir `auth.uid()`

---

### La app sigue usando Dexie en lugar de Supabase

**Causa**: `VITE_DB_PROVIDER` no está configurado correctamente.

**Solución**:
1. Abre `.env.local`
2. Confirma que diga:
   ```bash
   VITE_DB_PROVIDER=supabase
   ```
3. Guarda el archivo
4. **Detén y reinicia el servidor**:
   ```bash
   # Presiona Ctrl+C
   npm run dev
   ```

---

### Errores 500 o Timeout en consultas

**Causa**: Límites del plan Free de Supabase o región lejana.

**Solución**:
1. Verifica en Supabase Dashboard → Settings → Billing:
   - Free Plan: 500 MB storage, 2 GB transfer/mes
   - Si excedes, upgrade a Pro ($25/mes)
2. Si es por latencia:
   - Considera cambiar la región del proyecto (requiere recrear proyecto)
   - Usa `staleTime` más largo en TanStack Query para reducir requests

---

## 📊 Monitoreo y Límites del Plan Free

### Verificar Uso Actual
1. Ve a Supabase → Settings → Usage
2. Revisa:
   - **Database Size**: 500 MB máximo
   - **Bandwidth**: 2 GB/mes
   - **API Requests**: Ilimitados (pero con rate limiting)

### Optimizaciones para Mantenerse en Free
1. **Limpiar historial viejo**:
   ```sql
   DELETE FROM history WHERE date < NOW() - INTERVAL '6 months';
   ```

2. **Comprimir breakdown JSON** en history:
   ```typescript
   // En lugar de guardar todo el breakdown:
   breakdown: { /* 200 bytes */ }
   
   // Guarda solo lo esencial:
   breakdown: { finalPriceARS, finalPriceUSD }
   ```

3. **Usar cache agresivo** en TanStack Query:
   ```typescript
   useQuery({
     queryKey: ['brands'],
     queryFn: () => db.getAllBrands(),
     staleTime: 1000 * 60 * 10, // 10 minutos
     cacheTime: 1000 * 60 * 30  // 30 minutos
   });
   ```

---

## 🔐 Seguridad Adicional (Opcional)

### Habilitar Autenticación

Si quieres agregar login/registro:

1. **Configurar Auth en Supabase**:
   - Ve a Authentication → Providers
   - Habilita Email/Password
   - Opcional: Habilita Google, GitHub, etc.

2. **Modificar RLS Policies**:
   ```sql
   -- Ejemplo: Solo permitir a usuarios autenticados
   CREATE POLICY "Authenticated users can read brands"
     ON brands FOR SELECT
     USING (auth.role() = 'authenticated');
   ```

3. **Implementar en el frontend**:
   ```typescript
   import { supabase } from '@/lib/supabase';
   
   // Sign Up
   const { data, error } = await supabase.auth.signUp({
     email: 'user@example.com',
     password: 'secure-password'
   });
   
   // Sign In
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'secure-password'
   });
   ```

---

## 🎉 ¡Listo!

Tu app ahora está conectada a Supabase. Los datos se sincronizan en la nube y puedes acceder desde cualquier dispositivo.

### Próximos Pasos

1. **Configurar Real-time** (opcional):
   - Habilita subscripciones para actualizar UI en tiempo real
   - Ver: [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)

2. **Deploy a Producción**:
   - Netlify/Vercel con variables de entorno
   - Ver: `docs/DEPLOYMENT.md`

3. **Implementar Testing**:
   - Unit tests con Vitest
   - E2E tests con Playwright

---

## 📚 Referencias

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**¿Problemas no resueltos?**  
Abre un issue en el repositorio con:
- Mensaje de error completo
- Pasos para reproducir
- Versión de Node.js y npm (`node -v`, `npm -v`)
- Screenshot del error en Supabase Dashboard
