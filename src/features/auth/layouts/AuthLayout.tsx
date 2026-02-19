import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4">
      {/* Layer 1 — Background image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/bg_image.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Layer 2 — Dark overlay for readability */}
      <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm" />

      {/* Ambient gradient blobs — tonos turquesa sobre el overlay */}
      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-48 -left-48 w-[500px] h-[500px] bg-primary-500/15 rounded-full blur-[120px]" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-primary-400/12 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary-600/8 rounded-full blur-[100px]" />
      </div>

      {/* Layer 3 — Central container */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-30 w-full max-w-md"
      >
        {/* Branding */}
        <div className="text-center mb-8 select-none">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 mb-4 shadow-lg shadow-primary-600/40 ring-1 ring-primary-400/30">
            <span className="text-3xl leading-none" role="img" aria-label="Plug & Fix">
              🔌
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Plug &amp; Fix</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
            El sistema operativo para tu taller de reparaciones
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/5 p-8">
          {children}
        </div>

        {/* Footer hint */}
        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} Plug &amp; Fix · Todos los derechos reservados
        </p>
      </motion.div>
    </div>
  );
}
