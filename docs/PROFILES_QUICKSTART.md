# Quick Start: User Profiles

## 🚀 Aplicar la Migración

### Paso 1: Accede a Supabase Dashboard
```
https://app.supabase.com → Tu Proyecto → SQL Editor
```

### Paso 2: Ejecuta el script de migración
Copia y pega el contenido de:
```
/supabase/migrations/20260218000000_create_profiles.sql
```

### Paso 3: Verifica la instalación (Opcional)
Ejecuta el script de prueba:
```
/supabase/migrations/20260218000001_test_profiles.sql
```

## 📝 Uso en el Código

### Importar el servicio
```typescript
import { ProfileService } from '@/core/services';
```

### Obtener perfil del usuario actual
```typescript
const profile = await ProfileService.getCurrentUserProfile();
```

### Actualizar perfil
```typescript
await ProfileService.updateProfile({
  username: 'nuevo_username',
  full_name: 'Juan Pérez',
  avatar_url: 'https://...'
});
```

### Registrar usuario con perfil
```typescript
await ProfileService.signUp(
  'email@example.com',
  'password123',
  {
    username: 'juanperez',
    full_name: 'Juan Pérez'
  }
);
```

### Verificar disponibilidad de username
```typescript
const isAvailable = await ProfileService.isUsernameAvailable('nuevo_username');
```

### Buscar perfiles
```typescript
const results = await ProfileService.searchProfiles('juan');
```

## ✅ Verificación de Integridad

### ¿Los datos existentes están seguros?
**SÍ** - Esta migración:
- ✅ NO modifica tablas existentes
- ✅ NO elimina datos
- ✅ Solo AGREGA nueva funcionalidad

### Tablas no afectadas:
- `brands`
- `models`
- `services`
- `config`
- `history`

## 📚 Documentación Completa
Ver: `/docs/USER_PROFILES_SETUP.md`

