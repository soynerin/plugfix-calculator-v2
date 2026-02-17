# PlugFix Calculator v2.0 📱

Sistema de gestión y cotización de reparaciones para servicios técnicos, construido con tecnología moderna y arquitectura limpia.

## 🚀 Tech Stack

* **Frontend:** React + TypeScript + Vite
* **Estilos:** Tailwind CSS + Shadcn/UI
* **Backend/DB:** Supabase (PostgreSQL)
* **Estado/Cache:** TanStack Query
* **Iconos:** Lucide React

## 🛠️ Configuración e Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone [URL_DEL_REPO]
    cd plugfix-calculator
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Variables de Entorno:**
    Crea un archivo `.env.local` en la raíz del proyecto con tus credenciales de Supabase:
    ```env
    VITE_SUPABASE_URL=tu_url_de_supabase
    VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
    ```

4.  **Correr el proyecto:**
    ```bash
    npm run dev
    ```

## 🗄️ Modelo de Datos (Supabase)

El proyecto utiliza las siguientes tablas en Supabase:
* `brands` (Marcas)
* `models` (Modelos con riesgo y gama)
* `services` (Servicios y mano de obra)
* `repairs` (Historial de reparaciones y clientes)
* `settings` (Configuración del negocio: Precio Hora, Dólar, Margen)

## ✨ Funcionalidades

* Calculadora de precios en tiempo real.
* Gestión de Clientes y Reparaciones.
* Cotización automática del Dólar Blue (API).
* Modo Oscuro / Claro.
* Diseño Responsive (Mobile First).

---
Desarrollado con ❤️ por **soynerin**
