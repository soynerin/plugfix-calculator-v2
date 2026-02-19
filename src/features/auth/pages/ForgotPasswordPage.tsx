import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthLayout } from '../layouts/AuthLayout';
import { cn } from '@/shared/utils';

const schema = z.object({
  email: z.string().email('Ingresá un email válido'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
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
      const redirectTo = `${window.location.origin}/update-password`;
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(data.email, {
        redirectTo,
      });
      if (error) throw error;
      setIsSuccess(true);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : 'Ocurrió un error inesperado. Intentá de nuevo.',
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
              ¡Revisá tu correo!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Si el correo existe en nuestra base de datos, recibirás un enlace de recuperación en
              los próximos minutos.
            </p>
          </div>
          <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 px-4 py-3 text-sm text-primary-700 dark:text-primary-300 text-left flex gap-3 items-start">
            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Si no ves el correo en tu bandeja principal, revisá la carpeta de{' '}
              <strong>spam</strong> o <strong>correo no deseado</strong>.
            </span>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio de sesión
          </Link>
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
            Recuperar contraseña
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
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

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
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
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

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
                Enviando enlace…
              </span>
            ) : (
              'Enviar enlace de recuperación'
            )}
          </button>
        </form>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al inicio de sesión
        </Link>
      </div>
    </AuthLayout>
  );
}
