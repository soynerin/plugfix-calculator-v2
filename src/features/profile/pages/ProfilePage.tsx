import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Camera, User, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { UserMenu } from '@/shared/components/UserMenu';
import { useAuth } from '@/features/auth';
import { ProfileService } from '@/core/services/ProfileService';
import { getSupabaseClient } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Button } from '@/shared/ui/button';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { useToast } from '@/shared/hooks/use-toast';
import { cn } from '@/shared/utils';
import { pageVariants, pageTransition } from '@/shared/utils/animations';
import type { UserProfile } from '@/core/domain/models';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const personalSchema = z.object({
  username: z
    .string()
    .max(30, 'Máximo 30 caracteres')
    .regex(/^[a-zA-Z0-9_]*$/, 'Solo letras, números y guiones bajos')
    .optional()
    .or(z.literal('')),
  full_name: z.string().max(100, 'Máximo 100 caracteres').optional().or(z.literal('')),
});

const securitySchema = z
  .object({
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type PersonalFormValues = z.infer<typeof personalSchema>;
type SecurityFormValues = z.infer<typeof securitySchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const personalForm = useForm<PersonalFormValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: { username: '', full_name: '' },
  });

  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // ─── Load profile ──────────────────────────────────────────────────────────
  // Uses user.id from AuthContext to SELECT directly from the profiles table.

  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setProfile(data);
        setAvatarUrl(data?.avatar_url ?? null);
        personalForm.reset({
          username: data?.username ?? '',
          full_name: data?.full_name ?? '',
        });
      } catch (err) {
        console.error('Error cargando el perfil:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ─── Derived display values ────────────────────────────────────────────────

  const displayName =
    profile?.full_name ||
    profile?.username ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.username as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Usuario';

  const email = user?.email ?? '';

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSavePersonal = async (values: PersonalFormValues) => {
    setIsSavingPersonal(true);
    try {
      const success = await ProfileService.updateProfile({
        username: values.username || null,
        full_name: values.full_name || null,
      });
      if (success) {
        setProfile((prev) =>
          prev
            ? { ...prev, username: values.username || null, full_name: values.full_name || null }
            : prev
        );
        toast({ title: '¡Perfil actualizado!', description: 'Tus datos fueron guardados correctamente.' });
      } else {
        toast({ title: 'Error', description: 'No se pudo actualizar el perfil.', variant: 'destructive' });
      }
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleUpdatePassword = async (values: SecurityFormValues) => {
    setIsSavingPassword(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({
          title: '¡Contraseña configurada!',
          description: 'Contraseña configurada correctamente. Ahora puedes usarla para iniciar sesión.',
        });
        securityForm.reset();
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Optimistic preview with local blob URL
    const objectUrl = URL.createObjectURL(file);
    setAvatarUrl(objectUrl);
    setIsUploadingAvatar(true);

    try {
      const supabase = getSupabaseClient();

      // Unique path: userId/timestamp.ext  → avoids CDN caching stale images
      const fileExt = file.name.split('.').pop() ?? 'jpg';
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Retrieve permanent public URL (no cache-buster needed — the path is already unique)
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // Persist the new avatar_url to the profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Swap the blob preview for the permanent URL, then free blob memory
      URL.revokeObjectURL(objectUrl);
      setAvatarUrl(publicUrl);
      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      toast({ title: '¡Avatar actualizado!', description: 'Tu foto de perfil fue cambiada.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast({ title: 'Error al subir el avatar', description: message, variant: 'destructive' });
      // Roll back preview to the last known good avatar
      URL.revokeObjectURL(objectUrl);
      setAvatarUrl(profile?.avatar_url ?? null);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Shared header ─────────────────────────────────────────────────────────

  const AppHeader = () => (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-3 md:py-4 max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          {/* Left: back button + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              title="Volver"
              className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="space-y-0.5">
              <h1 className="text-2xl md:text-3xl font-bold">PlugFix Calculator v2.0</h1>
              <p className="text-xs text-muted-foreground hidden md:block">Mi Perfil</p>
            </div>
          </div>
          {/* Right: theme toggle + user menu */}
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-2xl pb-24 md:pb-10">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
        >
          {/* Profile card */}
          <div className="bg-card rounded-2xl shadow-sm border overflow-hidden">

            {/* ── Profile header ──────────────────────────────────────────── */}
            <div className="px-6 pt-8 pb-6 border-b flex flex-col items-center gap-3">
              {/* Avatar with camera overlay */}
              <div className="relative group">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-muted ring-4 ring-background shadow-md">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10">
                      <User className="h-10 w-10 text-primary/50" />
                    </div>
                  )}
                </div>

                {/* Camera hover overlay */}
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  title="Cambiar foto"
                  className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/45 flex items-center justify-center transition-all disabled:cursor-not-allowed"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin opacity-0 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Name + email */}
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground">{displayName}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{email}</p>
              </div>
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────────── */}
            <Tabs defaultValue="personal" className="p-5 md:p-6">
              <TabsList className="w-full grid grid-cols-2 mb-6">
                <TabsTrigger value="personal" className="gap-2 text-sm">
                  <User className="h-3.5 w-3.5" />
                  Datos Personales
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2 text-sm">
                  <Lock className="h-3.5 w-3.5" />
                  Seguridad
                </TabsTrigger>
              </TabsList>

              {/* ── Personal Data Tab ──────────────────────────────────────── */}
              <TabsContent value="personal">
                <motion.div
                  key="personal"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  transition={pageTransition}
                >
                  <form
                    onSubmit={personalForm.handleSubmit(handleSavePersonal)}
                    className="space-y-5"
                  >
                    {/* Username */}
                    <div className="space-y-1.5">
                      <Label htmlFor="username">Nombre de usuario</Label>
                      <Input
                        id="username"
                        placeholder="ej. juan_perez"
                        autoComplete="username"
                        {...personalForm.register('username')}
                      />
                      {personalForm.formState.errors.username && (
                        <p className="text-xs text-destructive mt-1">
                          {personalForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    {/* Full name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="full_name">Nombre completo</Label>
                      <Input
                        id="full_name"
                        placeholder="ej. Juan Pérez"
                        autoComplete="name"
                        {...personalForm.register('full_name')}
                      />
                      {personalForm.formState.errors.full_name && (
                        <p className="text-xs text-destructive mt-1">
                          {personalForm.formState.errors.full_name.message}
                        </p>
                      )}
                    </div>

                    {/* Avatar upload button */}
                    <div className="space-y-1.5">
                      <Label>Foto de perfil</Label>
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        disabled={isUploadingAvatar}
                        className={cn(
                          'flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md',
                          'border border-dashed border-input',
                          'text-sm text-muted-foreground transition-all',
                          'hover:border-primary hover:bg-primary/5 hover:text-foreground',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                        {isUploadingAvatar ? 'Subiendo imagen...' : 'Cambiar foto de perfil'}
                      </button>
                    </div>

                    {/* Save button */}
                    <Button type="submit" className="w-full" size="lg" disabled={isSavingPersonal}>
                      {isSavingPersonal && <Loader2 className="h-4 w-4 animate-spin" />}
                      Guardar Cambios
                    </Button>
                  </form>
                </motion.div>
              </TabsContent>

              {/* ── Security Tab ───────────────────────────────────────────── */}
              <TabsContent value="security">
                <motion.div
                  key="security"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  transition={pageTransition}
                >
                  <form
                    onSubmit={securityForm.handleSubmit(handleUpdatePassword)}
                    className="space-y-5"
                  >
                    {/* New password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Nueva Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres"
                          autoComplete="new-password"
                          {...securityForm.register('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {securityForm.formState.errors.password && (
                        <p className="text-xs text-destructive mt-1">
                          {securityForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Repetí tu contraseña"
                          autoComplete="new-password"
                          {...securityForm.register('confirmPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                          aria-label={
                            showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {securityForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-destructive mt-1">
                          {securityForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    {/* Explanatory note */}
                    <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-4 py-3 leading-relaxed border border-border/50">
                      Si iniciaste sesión con Google y deseas poder ingresar con contraseña, puedes
                      crearla aquí. Si ya tienes una, esto la actualizará.
                    </p>

                    {/* Update button */}
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isSavingPassword}
                    >
                      {isSavingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                      Actualizar Contraseña
                    </Button>
                  </form>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
