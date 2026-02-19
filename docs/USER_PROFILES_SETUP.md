# User Profiles Setup - PlugFix Calculator

## 📋 Resumen

Este documento describe la infraestructura de perfiles de usuario implementada en Supabase para extender la funcionalidad de autenticación sin perder datos existentes.

## 🗄️ Estructura de la Tabla `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,              -- Referencia a auth.users(id)
  username TEXT UNIQUE,             -- Nombre de usuario único (opcional)
  full_name TEXT,                   -- Nombre completo del usuario
  avatar_url TEXT,                  -- URL del avatar del usuario
  updated_at TIMESTAMPTZ,           -- Última actualización
  created_at TIMESTAMPTZ            -- Fecha de creación
);
```

### Características Clave:
- **Relación 1:1 con auth.users**: Cada perfil está vinculado a un usuario de autenticación
- **Eliminación en cascada**: Si se elimina un usuario, su perfil se elimina automáticamente
- **Username único**: Previene duplicados de nombres de usuario
- **Timestamps automáticos**: Se actualizan automáticamente con triggers

## 🔄 Trigger de Creación Automática

Cuando un nuevo usuario se registra en Supabase Auth, automáticamente se crea una entrada en `profiles`:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### ¿Cómo funciona?
1. Usuario se registra mediante Supabase Auth (correo/contraseña, OAuth, etc.)
2. Se crea una fila en `auth.users`
3. El trigger detecta la inserción
4. Automáticamente crea una fila en `public.profiles` con los metadatos del usuario

### Metadatos Soportados:
Los siguientes campos se extraen de `raw_user_meta_data` al registrarse:
- `username`
- `full_name`
- `avatar_url`

## 🔒 Políticas de Seguridad (RLS)

### Habilitado Row Level Security
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Políticas Implementadas:

#### 1. Lectura Pública (Public Read)
```sql
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);
```
**Permite:** Cualquier usuario (autenticado o no) puede leer todos los perfiles.  
**Uso:** Funciones sociales, búsqueda de usuarios, directorios públicos.

#### 2. Inserción Propia (Create Own)
```sql
CREATE POLICY "Users can create their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```
**Permite:** Solo el usuario autenticado puede crear su propio perfil.  
**Previene:** Creación de perfiles falsos o suplantación.

#### 3. Actualización Propia (Update Own)
```sql
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```
**Permite:** Solo el dueño del perfil puede actualizar sus datos.  
**Previene:** Modificación no autorizada de perfiles ajenos.

#### 4. Eliminación Propia (Delete Own)
```sql
CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);
```
**Permite:** Solo el dueño puede eliminar su perfil.

## 🚀 Aplicar la Migración

### Opción 1: Supabase Dashboard (Recomendado)
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Copia el contenido de `/supabase/migrations/20260218000000_create_profiles.sql`
4. Pégalo en el editor y ejecuta con **"Run"**
5. Verifica que no haya errores en la salida

### Opción 2: Supabase CLI
```bash
# Asegúrate de estar conectado a tu proyecto
supabase db push

# O aplica la migración específica
supabase migration up --file 20260218000000_create_profiles.sql
```

### Verificación Post-Migración
```sql
-- Verificar que la tabla existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'profiles';

-- Verificar políticas RLS
SELECT * 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Verificar trigger
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

## 📝 Uso en el Código

### TypeScript/JavaScript (Supabase Client)

#### Obtener el perfil del usuario actual:
```typescript
const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
```

#### Actualizar perfil del usuario:
```typescript
const { error } = await supabase
  .from('profiles')
  .update({ 
    username: 'nuevo_username',
    full_name: 'Juan Pérez',
    avatar_url: 'https://example.com/avatar.jpg'
  })
  .eq('id', user.id);
```

#### Buscar perfiles públicos:
```typescript
const { data: profiles, error } = await supabase
  .from('profiles')
  .select('*')
  .ilike('username', '%búsqueda%');
```

#### Registrar usuario con metadatos:
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@example.com',
  password: 'contraseña_segura',
  options: {
    data: {
      username: 'juanperez',
      full_name: 'Juan Pérez',
      avatar_url: 'https://example.com/avatar.jpg'
    }
  }
});
// El perfil se crea automáticamente con estos datos
```

## 🛡️ Seguridad y Mejores Prácticas

### ✅ Ventajas del Diseño Actual:
- **Seguridad por defecto**: RLS habilitado desde el inicio
- **Privacidad del usuario**: Solo el dueño puede modificar su perfil
- **Transparencia social**: Perfiles públicos para features como búsqueda
- **Integridad referencial**: Cascada de eliminación previene datos huérfanos

### ⚠️ Consideraciones:
1. **Usernames duplicados**: La restricción UNIQUE previene duplicados
2. **Datos sensibles**: No almacenar información privada en `profiles` (usar tablas separadas con RLS más restrictivo)
3. **Avatares**: Almacenar en Supabase Storage y solo guardar la URL pública

### 🔐 Ajustar Políticas (Opcional):
Si necesitas perfiles privados, reemplaza la política de lectura pública:
```sql
-- Deshabilitar lectura pública
DROP POLICY "Public profiles are viewable by everyone" ON profiles;

-- Solo usuarios autenticados pueden ver perfiles
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- O perfiles completamente privados (solo el dueño)
CREATE POLICY "Users can only view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```

## 🔧 Funciones Helper Incluidas

### `get_profile(user_id UUID)`
Obtiene un perfil específico por ID:
```sql
SELECT * FROM get_profile('uuid-del-usuario');
```

### `search_profiles(search_query TEXT)`
Busca perfiles por username o nombre completo:
```sql
SELECT * FROM search_profiles('juan');
```

## 📊 Monitoreo y Mantenimiento

### Ver todos los perfiles:
```sql
SELECT id, username, full_name, created_at 
FROM profiles 
ORDER BY created_at DESC;
```

### Contar perfiles:
```sql
SELECT COUNT(*) as total_profiles FROM profiles;
```

### Verificar perfiles sin username:
```sql
SELECT id, full_name, created_at 
FROM profiles 
WHERE username IS NULL;
```

## ✅ Garantía de Integridad

### Este script SQL NO afecta:
- ✅ Tabla `brands` y sus datos
- ✅ Tabla `models` y sus datos
- ✅ Tabla `services` y sus datos
- ✅ Tabla `config` y su configuración
- ✅ Tabla `history` y sus registros
- ✅ Triggers existentes
- ✅ Políticas RLS existentes
- ✅ Funciones helper existentes

### Solo agrega:
- ➕ Nueva tabla `profiles`
- ➕ Trigger de auto-creación de perfiles
- ➕ Políticas RLS para `profiles`
- ➕ Funciones helper para consultas de perfiles

## 🆘 Troubleshooting

### Error: "relation auth.users does not exist"
**Causa:** Intentando ejecutar en una base de datos que no es Supabase.  
**Solución:** Esta migración solo funciona en Supabase donde `auth.users` existe.

### Error: "duplicate key value violates unique constraint"
**Causa:** Intentando usar un username ya existente.  
**Solución:** Elegir un username único o manejar el error en el frontend.

### Perfil no se crea automáticamente
**Verificar:** 
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
Si no existe, ejecutar manualmente la parte del trigger en la migración.

## 📚 Próximos Pasos

1. **Integrar en la UI**: Crear componente de perfil de usuario
2. **Avatar Upload**: Implementar carga de imágenes con Supabase Storage
3. **Validación de Username**: Agregar regex para usernames válidos
4. **Perfil Público**: Crear página pública para cada perfil
5. **Búsqueda Avanzada**: Implementar búsqueda full-text

---

**Fecha de creación:** 18 de febrero de 2026  
**Versión:** 1.0  
**Autor:** Sistema PlugFix Calculator

