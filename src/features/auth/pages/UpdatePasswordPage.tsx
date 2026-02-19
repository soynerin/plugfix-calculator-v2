import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthLayout } from '../layouts/AuthLayout';
import { Spinner } from '@/shared/components/Spinner';
import { cn } from '@/shared/utils';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/\d/, 'La contraseña debe incluir al menos un número'),
    confirmPassword: z.string().min(1, 'Confirmá tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    try {
      const { error } = await getSupabaseClient().auth.updateUser({
        password: data.password,
      });
      if (error) throw error;
      setIsSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
      // Friendly message for expired/invalid token
      setServerError(
        message.toLowerCase().includes('token')
          ? 'El enlace expiró o ya fue utilizado. Solicitá uno nuevo desde la pantalla de recuperación.'
          : message,
      );
    }
  };

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
              ¡Contraseña actualizada!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Tu contraseña fue cambiada correctamente. Te redirigimos al inicio de sesión…
            </p>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <motion.div
              className="h-full bg-primary-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.5, ease: 'linear' }}
            />
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Heading */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Nueva contraseña
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Elegí una contraseña segura para tu cuenta.
          </p>
        </div>

        {/* Server error */}
        <AnimatePresence>
          {serverError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            >
              {serverError}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* New password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Nueva contraseña
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
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repetí la contraseña"
                {...register('confirmPassword')}
                className={cn(
                  'w-full h-11 rounded-lg border bg-white dark:bg-gray-800 pl-10 pr-10 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 focus:border-transparent',
                  errors.confirmPassword
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600',
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Requirements hint */}
          <ul className="flex gap-4 text-xs text-gray-400 dark:text-gray-500">
            <li className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              8+ caracteres
            </li>
            <li className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              1 número
            </li>
          </ul>

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
                <Spinner size="sm" />
                Guardando…
              </span>
            ) : (
              'Guardar nueva contraseña'
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
