// vite.config.ts - Configuración completa para el proyecto React + TypeScript

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Fast Refresh optimizado para React 19
      fastRefresh: true,
    })
  ],
  
  // Path aliases (@/* apunta a src/*)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Configuración del servidor de desarrollo
  server: {
    port: 3000,
    open: true, // Abre el navegador automáticamente
    host: true, // Permite acceso desde la red local (mobile testing)
  },

  // Optimización de build
  build: {
    // Target para navegadores modernos (ES2020+)
    target: 'es2020',
    
    // Sourcemaps para debugging en producción (opcional)
    sourcemap: false,
    
    // Chunk splitting para mejor caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendors grandes
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['lucide-react'],
          'db-vendor': ['dexie', '@supabase/supabase-js'],
        },
      },
    },

    // Límite de advertencia de tamaño de chunk (500kb)
    chunkSizeWarningLimit: 500,
  },

  // Optimización de dependencias
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'dexie',
    ],
  },

  // Variable de entorno
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
