# 🚀 PROMPT PARA CONTINUAR LA MIGRACIÓN

## **CONTEXTO DEL PROYECTO**

**Proyecto:** PlugFix Calculator v2.0  
**Objetivo:** Migración profesional de SPA vanilla JS + Dexie a React + TypeScript con Clean Architecture  
**Estado Actual:** Fases 1-4 completas (85% del proyecto funcional)

---

## **✅ LO QUE YA ESTÁ COMPLETADO**

### **Phase 1: Setup & Scaffolding** ✅
- React 18.3 + TypeScript 5.6 + Vite 6.4
- Tailwind CSS 3.4 configurado con dark mode
- 10 componentes shadcn/ui instalados (button, input, select, card, tabs, dialog, table, toast, label, toaster)
- Path aliases configurados (@/core, @/features, @/shared)
- 0 errores de TypeScript en modo strict

### **Phase 2: Core Data Layer** ✅
- **5 modelos de dominio TypeScript:**
  - `Brand.ts`, `RepairModel.ts`, `Service.ts`, `PriceConfig.ts`, `RepairHistory.ts`
- **IDatabaseService interface** completa con CRUD operations
- **DexieAdapter** (~320 líneas) completamente funcional
- **SupabaseAdapter** stub preparado para Phase 5
- **DatabaseFactory** con patrón Singleton y switching por .env
- **PriceCalculator** service (lógica pura TypeScript sin React)

### **Phase 3: React Hooks** ✅
- **6 custom hooks con TanStack Query:**
  - `useBrands`, `useModels`, `useServices`, `useConfig`, `usePriceCalculator`, `useHistory`
- Cache configurado (5min stale time)
- Optimistic updates implementados
- Invalidación de queries tras mutaciones

### **Phase 4: UI Implementation** ✅
- **CalculatorForm** completo con:
  - Selects en cascada (Brand → Model → Service)
  - Cálculo en tiempo real con breakdown detallado
  - Guardado en historial
- **HistoryViewer** con:
  - Tabla de historial completa
  - Filtros avanzados (Cliente, Marca, Modelo, Fecha) con combos en cascada
  - Export CSV/JSON
  - Modal de detalle
  - **Fix crítico:** Estado separado para prevenir flickering en inputs
- **CRUD Managers:**
  - `BrandManager`, `ModelManager`, `ServiceManager`, `ConfigManager`
  - Formularios completos con validación
  - Live preview del cálculo en ConfigManager

### **Features Adicionales Implementadas** 🎨
- **Dark Mode Toggle** con Zustand + persistencia localStorage
- **Animaciones Framer Motion** en transiciones de tabs (fade + slide, 300ms)
- **Tab navigation** funcional (6 tabs: Calculator, History, Brands, Models, Services, Config)
- **Responsive design** con Tailwind (mobile-first)

### **Stack Tecnológico Final**
```json
{
  "react": "18.3.1",
  "typescript": "5.6.2",
  "vite": "6.4.1",
  "dexie": "4.0.8",
  "@tanstack/react-query": "5.56.2",
  "zustand": "5.0.2",
  "tailwindcss": "3.4.17",
  "framer-motion": "11.x",
  "lucide-react": "0.460.0"
}
```

### **Base de Datos**
- **Provider actual:** Dexie (IndexedDB)
- **Esquema:** 5 tablas (brands, models, services, config, history)
- **Seed data:** Samsung, Apple, 3 servicios, configuración inicial
- **Estado:** 100% funcional offline

---

## **⏳ LO QUE FALTA POR HACER**

### **Phase 5: Supabase Migration** (PENDIENTE - 3-5 días)

**Tareas:**
1. **Script de migración de datos legacy**
   - Crear `MigrationService.ts` para migrar de IndexedDB viejo a nuevo
   - Validar integridad de datos

2. **Setup de Supabase:**
   - Crear proyecto en Supabase
   - Ejecutar schema SQL (ya documentado en `supabase-schema.sql`)
   - Configurar RLS (Row Level Security)
   - Configurar Real-time subscriptions

3. **Implementar SupabaseAdapter completo:**
   - Reemplazar los `throw new Error('Not implemented')` en `src/core/services/adapters/SupabaseAdapter.ts`
   - Implementar todos los métodos: CRUD, search, export, backup/restore
   - Agregar tipos TypeScript de Supabase generados

4. **Sincronización Offline/Online:**
   - Queue de operaciones pendientes cuando offline
   - Conflict resolution strategy (last-write-wins o manual)
   - Indicador visual de estado de conexión

5. **Autenticación Supabase (opcional):**
   - Auth con email/password
   - Proteger rutas con middleware
   - Multi-tenant data isolation

6. **Configuración .env:**
   ```bash
   VITE_DB_PROVIDER=supabase  # Cambiar de 'dexie' a 'supabase'
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```

**Archivos a modificar:**
- `src/core/services/adapters/SupabaseAdapter.ts` (implementar 13 métodos)
- `src/lib/supabase.ts` (crear instancia del cliente)
- `.env.local` (agregar credenciales)

---

## **🧪 TESTING (OPCIONAL - 2-3 días)**

**Tareas:**
1. Instalar Vitest + React Testing Library
2. Unit tests para:
   - `PriceCalculator.ts` (lógica de negocio pura)
   - Custom hooks con mock de TanStack Query
   - Componentes UI críticos (CalculatorForm, HistoryViewer)
3. E2E tests con Playwright (opcional):
   - Flujo completo de cálculo
   - CRUD de brands/models/services

---

## **📦 PRODUCTION BUILD (1 día)**

**Tareas:**
1. Configuración de build:
   - Optimizar bundle size (code splitting)
   - Tree shaking de dependencias no usadas
   - Lazy loading de rutas con React.lazy()

2. Performance:
   - Lighthouse audit (target: 90+ en Performance)
   - Lazy load de componentes pesados
   - Virtualizar lista de historial si > 1000 registros

3. SEO & Meta tags:
   - Helmet para meta tags dinámicos
   - Open Graph tags
   - Sitemap y robots.txt

4. Deployment:
   - Netlify/Vercel (recomendado para frontend)
   - Supabase Functions para backend logic (opcional)

---

## **🚀 FEATURES AVANZADAS (POST-LAUNCH)**

**Ideas para después de Phase 5:**
1. **API Dólar Blue:**
   - Integrar con API pública (ej: https://dolarapi.com/)
   - Actualización automática del tipo de cambio USD
   - Cache de 1 hora con TanStack Query

2. **Sistema de Templates:**
   - Plantillas precargadas de reparaciones comunes
   - "Guardar como template" desde calculadora

3. **Reports & Analytics:**
   - Dashboard con gráficas (recharts/visx)
   - Ingresos por mes/marca/servicio
   - Export de reportes en PDF

4. **Multi-idioma (i18n):**
   - react-i18next para traducir UI
   - Soportar español/inglés/portugués

5. **PWA (Progressive Web App):**
   - Service Worker para funcionar 100% offline
   - Installable en mobile/desktop
   - Push notifications para recordatorios

---

## **📁 ARQUITECTURA DEL PROYECTO**

```
plugfix-calculator-v2/
├── src/
│   ├── core/                      # ✅ Completo
│   │   ├── domain/models/         # 5 modelos TypeScript
│   │   └── services/
│   │       ├── interfaces/        # IDatabaseService
│   │       ├── adapters/          # DexieAdapter ✅ | SupabaseAdapter ⏳
│   │       ├── DatabaseFactory.ts
│   │       └── PriceCalculator.ts
│   │
│   ├── features/                  # ✅ Completo
│   │   ├── calculator/            # CalculatorForm ✅
│   │   ├── inventory/             # 4 CRUD managers ✅
│   │   └── history/               # HistoryViewer ✅
│   │
│   ├── shared/                    # ✅ Completo
│   │   ├── ui/                    # 10 shadcn components
│   │   ├── components/            # ThemeToggle
│   │   ├── stores/                # useThemeStore (Zustand)
│   │   └── utils/                 # animations, formatters, cn
│   │
│   ├── App.tsx                    # ✅ Tab navigation + animations
│   └── main.tsx                   # ✅ Entry point
│
├── package.json                   # 403 dependencias instaladas
├── vite.config.ts                 # ✅ Path aliases
├── tsconfig.json                  # ✅ Strict mode
├── tailwind.config.js             # ✅ Dark mode + theme
└── .env.local                     # VITE_DB_PROVIDER=dexie
```

---

## **🎯 PRIORIDAD DE TAREAS AL CONTINUAR**

### **1. INMEDIATO (si querés terminar la migración completa):**
- Implementar SupabaseAdapter completo
- Crear proyecto Supabase y ejecutar schema SQL
- Testear switch entre Dexie ↔ Supabase

### **2. OPCIONAL (si querés mejorar la app antes de Cloud):**
- Agregar API Dólar Blue integration
- Implementar testing básico con Vitest
- Crear system de templates

### **3. LARGO PLAZO:**
- PWA + Service Workers
- Multi-idioma
- Dashboard analytics

---

## **🔑 COMANDOS CLAVE**

```bash
# Development
npm run dev              # http://localhost:3000

# Type Check
npm run type-check       # Verificar TypeScript (debe ser 0 errores)

# Build
npm run build            # Compilar para producción

# Preview Build
npm run preview          # Testear build localmente
```

---

## **💡 NOTAS TÉCNICAS IMPORTANTES**

1. **Estado del tema persiste** en `localStorage` bajo key `theme-storage`
2. **DexieDB name:** `PlugFixDB_v2`
3. **TanStack Query cache:** 5 minutos de stale time
4. **Animaciones:** Framer Motion con fade + slide (300ms ease-in-out)
5. **Fix crítico aplicado:** HistoryViewer usa estado local separado para prevenir flickering en inputs
6. **React version:** 18.3.1 (downgradeado de 19 por incompatibilidad con lucide-react)

---

## **🤝 ¿CÓMO CONTINUAR?**

### **Si querés terminar la migración completa:**

"Continúa con Phase 5: Implementa el SupabaseAdapter completo. El stub ya está creado en `src/core/services/adapters/SupabaseAdapter.ts`. Necesito implementar los 13 métodos faltantes (getAllBrands, addBrand, etc.) usando el cliente de Supabase. Usa el mismo patrón que DexieAdapter pero con llamadas a Supabase Postgrest. También crea el archivo `src/lib/supabase.ts` con la instancia del cliente."

### **Si querés agregar features antes de Cloud:**

"Vamos a implementar la integración con la API Dólar Blue. Necesito crear un servicio `CurrencyService.ts` que consulte https://dolarapi.com/v1/dolares/blue y actualice automáticamente el campo `usdRate` en la configuración. Usa TanStack Query con staleTime de 1 hora para el cache."

### **Si querés hacer testing:**

"Configura Vitest y React Testing Library. Luego crea tests unitarios para el servicio PriceCalculator (testear cálculos con diferentes riesgos, monedas y márgenes). También testea los hooks useBrands, useModels y useServices con mock de TanStack Query."

---

## **📊 PROGRESO GENERAL**

| Fase | Estado | % Completado |
|------|--------|--------------|
| Phase 1: Setup & Scaffolding | ✅ Completa | 100% |
| Phase 2: Core Data Layer | ✅ Completa | 100% |
| Phase 3: React Hooks | ✅ Completa | 100% |
| Phase 4: UI Implementation | ✅ Completa | 100% |
| Phase 5: Supabase Migration | ⏳ Pendiente | 0% |
| Testing | ⏳ Opcional | 0% |
| Production Build | ⏳ Pendiente | 0% |

**Total proyecto:** ~85% completado

---

## **🎉 LOGROS DESTACADOS**

- ✅ Arquitectura Clean separando lógica de negocio (core) de UI (features)
- ✅ Adapter Pattern permite cambiar de backend con 1 línea (.env)
- ✅ TypeScript strict mode: 0 errores de compilación
- ✅ Dark mode con persistencia y detección de sistema
- ✅ Animaciones fluidas que mejoran UX
- ✅ Filtros sin flickering (estado local separado de query state)
- ✅ Cascading selects en formularios (Brand → Model)
- ✅ Export de datos (CSV/JSON) desde History
- ✅ Live preview en configuración de precios
- ✅ Responsive design mobile-first

---

¿Con cuál de estas opciones querés continuar en el nuevo repositorio?
