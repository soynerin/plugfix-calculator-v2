// vite.config.ts - Configuración completa para el proyecto React + TypeScript

import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { pathToFileURL } from 'node:url';

// ─── Local Netlify Functions middleware ───────────────────────────────────────
// During `vite dev`, intercepts /.netlify/functions/* requests and runs the
// handler in-process. No netlify-cli required. Vite loads ALL .env.local vars
// into process.env at startup, so server-side secrets are available here.
function netlifyFunctionsPlugin(): Plugin {
  return {
    name: 'netlify-functions-dev',
    apply: 'serve',
    configureServer(server) {
      // Inject ALL .env.local vars (including non-VITE_ secrets) into process.env
      // so the Netlify function handler can read SUPABASE_SERVICE_ROLE_KEY, etc.
      const env = loadEnv(server.config.mode, process.cwd(), '');
      Object.assign(process.env, env);

      server.middlewares.use('/.netlify/functions', (req, res, next) => {
        const functionName = (req.url ?? '').replace(/^\//, '').split('?')[0];

        if (functionName !== 'process-pricelist') {
          return next();
        }

        (async () => {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = Buffer.concat(chunks).toString();

          const event = {
            httpMethod: req.method ?? 'GET',
            path: `/.netlify/functions/${functionName}`,
            headers: req.headers,
            body,
            queryStringParameters: {},
          };

          const fnPath = path.resolve(
            process.cwd(),
            'netlify/functions/process-pricelist.js',
          );
          const { handler } = await import(`${pathToFileURL(fnPath).href}?t=${Date.now()}`);
          const result = await handler(event);

          // Log non-2xx responses to the dev server terminal for easy debugging
          if (result.statusCode >= 400) {
            console.error(`\n[netlify-fn] ${functionName} → ${result.statusCode}:`, result.body, '\n');
          }

          res.writeHead(result.statusCode, {
            'Content-Type': 'application/json',
            ...(result.headers ?? {}),
          });
          res.end(result.body);
        })().catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Internal Server Error';
          console.error(`\n[netlify-fn] ${functionName} unhandled:`, err, '\n');
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: message }));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Fast Refresh optimizado para React 19
      fastRefresh: true,
    }),
    netlifyFunctionsPlugin(),
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
          'db-vendor': ['@supabase/supabase-js'],
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
    ],
  },

  // Variable de entorno
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
