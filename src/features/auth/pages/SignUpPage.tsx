import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, User, Lock, CheckCircle2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthLayout } from '../layouts/AuthLayout';
import { cn } from '@/shared/utils';

// ─── Zod schema ──────────────────────────────────────────────────────────────

const signUpSchema = z.object({
  username: z
    .string()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
    .max(30, 'El nombre de usuario no puede superar los 30 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
  email: z.string().email('Ingresá un email válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/\d/, 'La contraseña debe incluir al menos un número'),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

// ─── Password strength helpers ───────────────────────────────────────────────

interface StrengthResult {
  score: number;        // 0–4
  label: string;
  color: string;        // Tailwind bg class
  textColor: string;    // Tailwind text class
}

function getPasswordStrength(password: string): StrengthResult {
  if (!password) {
    return { score: 0, label: '', color: 'bg-slate-200 dark:bg-gray-700', textColor: 'text-slate-400' };
  }
  let score = 0;
  if (password.length >= 8) score++;
  if (/\d/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const map: Record<number, Omit<StrengthResult, 'score'>> = {
    1: { label: 'Muy débil', color: 'bg-red-500',    textColor: 'text-red-500' },
    2: { label: 'Débil',     color: 'bg-orange-400', textColor: 'text-orange-500' },
    3: { label: 'Media',     color: 'bg-yellow-400', textColor: 'text-yellow-500' },
    4: { label: 'Fuerte',    color: 'bg-primary-500',textColor: 'text-primary-600 dark:text-primary-400' },
  };

  const entry = map[score] ?? { label: 'Muy débil', color: 'bg-red-500', textColor: 'text-red-500' };
  return { score, ...entry };
}

// ─── Brand icon components (inline SVG) ──────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.18 1.27-2.16 3.8.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.78M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

// ─── Password strength bar ────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color, textColor } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-1.5 mt-2"
    >
      {/* Bar segments */}
      <div className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 rounded-full transition-all duration-300',
              i <= score ? color : 'bg-slate-200 dark:bg-gray-700',
            )}
          />
        ))}
      </div>
      {/* Label */}
      <div className="flex items-center justify-between text-xs">
        <span className={cn('font-medium', textColor)}>{label}</span>
        <ul className="flex gap-2 text-slate-400 dark:text-gray-500">
          <li className={cn('flex items-center gap-0.5', password.length >= 8 && 'text-primary-500')}>
            <CheckCircle2 className="w-3 h-3" />
            8+ caracteres
          </li>
          <li className={cn('flex items-center gap-0.5', /\d/.test(password) && 'text-primary-500')}>
            <CheckCircle2 className="w-3 h-3" />
            1 número
          </li>
        </ul>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const passwordValue = watch('password', '');

  const onSubmit = async (data: SignUpFormValues) => {
    setServerError(null);
    try {
      const { error } = await getSupabaseClient().auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            display_name: data.username,
          },
        },
      });

      if (error) throw error;
      setIsSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
      setServerError(message);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="text-center space-y-5 py-4"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/30 mx-auto">
            <CheckCircle2 className="w-8 h-8 text-primary-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ¡Registro exitoso!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Revisá tu bandeja de entrada y confirmá tu cuenta haciendo clic en el enlace que te enviamos.
            </p>
          </div>
          <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 px-4 py-3 text-sm text-primary-700 dark:text-primary-300 text-left flex gap-3 items-start">
            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Si no ves el correo en tu bandeja principal, revisá la carpeta de <strong>spam</strong> o <strong>correo no deseado</strong>.
            </span>
          </div>
          <Link
            to="/login"
            className="inline-block text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
          >
            Ir al inicio de sesión →
          </Link>
        </motion.div>
      </AuthLayout>
    );
  }

  // ── Sign-up form ───────────────────────────────────────────────────────────
  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Heading */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Crear cuenta</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Completá tus datos para empezar
          </p>
        </div>

        {/* Server error banner */}
        <AnimatePresence>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            >
              {serverError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nombre de usuario
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="mi_taller_pro"
                {...register('username')}
                className={cn(
                  'w-full h-11 rounded-lg border bg-white dark:bg-gray-800 pl-10 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 focus:border-transparent',
                  errors.username
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600',
                )}
              />
            </div>
            {errors.username && (
              <p className="text-xs text-red-500">{errors.username.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="hola@mitaller.com"
                {...register('email')}
                className={cn(
                  'w-full h-11 rounded-lg border bg-white dark:bg-gray-800 pl-10 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 focus:border-transparent',
                  errors.email
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600',
                )}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                {...register('password')}
                className={cn(
                  'w-full h-11 rounded-lg border bg-white dark:bg-gray-800 pl-10 pr-10 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 focus:border-transparent',
                  errors.password
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600',
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
            {/* Strength bar */}
            <AnimatePresence>
              {passwordValue && <PasswordStrengthBar password={passwordValue} />}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full h-11 rounded-lg font-semibold text-sm text-white transition-all duration-200',
              'bg-primary-500 hover:bg-primary-600 active:scale-[.99]',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
              'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
              'shadow-sm shadow-primary-500/30',
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando cuenta…
              </span>
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white dark:bg-gray-900 text-gray-400">
              O regístrate con
            </span>
          </div>
        </div>

        {/* Social buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {/* TODO: supabase.auth.signInWithOAuth({ provider: 'google' }) */}}
            className="flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1"
            aria-label="Registrarse con Google"
          >
            <GoogleIcon />
            <span className="hidden sm:inline">Google</span>
          </button>

          <button
            type="button"
            onClick={() => {/* TODO: supabase.auth.signInWithOAuth({ provider: 'azure' }) */}}
            className="flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1"
            aria-label="Registrarse con Microsoft"
          >
            <MicrosoftIcon />
            <span className="hidden sm:inline">Microsoft</span>
          </button>

          <button
            type="button"
            onClick={() => {/* TODO: supabase.auth.signInWithOAuth({ provider: 'apple' }) */}}
            className="flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1"
            aria-label="Registrarse con Apple"
          >
            <AppleIcon />
            <span className="hidden sm:inline">Apple</span>
          </button>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          ¿Ya tenés cuenta?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline transition-colors"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
