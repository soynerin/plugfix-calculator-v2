/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // NUEVA PALETA "DEEP SEA TECH"
        // Shadcn/ui semantic colors (CSS variables)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          50: '#E6FFFA',  // Fondos tintados muy suaves
          100: '#B2F5EA', // Badges claros
          200: '#81E6D9',
          300: '#4FD1C5',
          400: '#2BC3B6', // Bordes de inputs en foco
          500: '#069D95', // COLOR HÉROE VIBRANTE (Botones principales)
          600: '#04827B', // Hover de botones
          700: '#036862', // Textos oscuros en modo claro
          800: '#02504C',
          900: '#013936',
          950: '#001F1E', // Fondos profundos en modo oscuro
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Neutros tipo "Slate" (Gris con subtono azulado para armonía)
        gray: {
          50: '#F8FAFC',
          100: '#F1F5F9', // Fondos secundarios claro
          200: '#E2E8F0', // Bordes claro
          300: '#CBD5E1',
          400: '#94A3B8', // Textos secundarios / Iconos inactivos
          500: '#64748B',
          600: '#475569',
          700: '#334155', // Texto principal claro
          800: '#1E293B', // FONDO PRINCIPAL MODO OSCURO (Azul marino profundo)
          900: '#0F172A', // Fondo secundario/Cards modo oscuro
          950: '#020617', // Bordes o acentos muy oscuros
        },
        // Colores semánticos para estados
        red: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444', // Para botón eliminar
          600: '#DC2626', // Hover eliminar
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
      },
      backgroundColor: theme => ({
        ...theme('colors'),
      }),
      textColor: theme => ({
        ...theme('colors'),
      }),
      borderColor: theme => ({
        ...theme('colors'),
      }),
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
