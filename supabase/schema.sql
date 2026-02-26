-- ============================================
-- PlugFix Calculator - Supabase Schema
-- Version: 2.0
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (Auth & Role Management)
-- ============================================
-- Phase 1: User roles management.
-- Each authenticated user gets exactly one profile row, created automatically
-- via the handle_new_user trigger defined in the TRIGGERS section.
--
-- To promote a user to admin, run in Supabase SQL Editor:
--   UPDATE profiles SET role = 'admin' WHERE id = '<user_uuid>';
CREATE TABLE profiles (
  id          UUID NOT NULL,
  username    TEXT NULL,
  full_name   TEXT NULL,
  avatar_url  TEXT NULL,
  email       TEXT NULL,
  role        TEXT NOT NULL DEFAULT 'tecnico'
                CONSTRAINT profiles_role_check
                  CHECK (role = ANY (ARRAY['admin', 'tecnico'])),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT profiles_pkey         PRIMARY KEY (id),
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT profiles_id_fkey      FOREIGN KEY (id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role     ON profiles(id, role);

-- ============================================
-- BRANDS TABLE
-- ============================================
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast brand lookups
CREATE INDEX idx_brands_name ON brands(name);

-- ============================================
-- MODELS TABLE
-- ============================================
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  risk_factor DECIMAL(3,2) NOT NULL CHECK (risk_factor BETWEEN 1.0 AND 2.5),
  category VARCHAR(50) CHECK (category IN ('Gama Baja', 'Gama Media', 'Gama Alta', 'Premium')),
  release_year INTEGER CHECK (release_year >= 2000 AND release_year <= 2100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, name)
);

-- Indexes for fast model lookups
CREATE INDEX idx_models_brand_id ON models(brand_id);
CREATE INDEX idx_models_name ON models(name);
CREATE INDEX idx_models_category ON models(category);
CREATE INDEX idx_models_release_year ON models(release_year);

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  hours DECIMAL(4,2) NOT NULL CHECK (hours > 0),
  base_price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast service lookups
CREATE INDEX idx_services_name ON services(name);

-- ============================================
-- CONFIG TABLE (one row per authenticated user)
-- ============================================
CREATE TABLE config (
  user_id UUID NOT NULL DEFAULT auth.uid() PRIMARY KEY
    REFERENCES auth.users(id) ON DELETE CASCADE,
  hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate > 0),
  margin DECIMAL(5,2) NOT NULL CHECK (margin >= 0 AND margin <= 100),
  usd_rate DECIMAL(10,2) NOT NULL CHECK (usd_rate > 0),
  -- Risk index multipliers (customizable per workshop)
  tier_multipliers  JSONB NOT NULL DEFAULT '{"premium": 2.0, "alta": 1.5, "media": 1.2, "baja": 1.0}'::JSONB,
  brand_multipliers JSONB NOT NULL DEFAULT '{"apple": 1.3, "samsung": 1.2, "motorola": 1.0, "xiaomi": 1.0, "otros": 1.0}'::JSONB,
  part_multipliers  JSONB NOT NULL DEFAULT '{"microelectronica": 2.0, "pantalla": 1.5, "pin_carga": 1.2, "bateria": 1.0}'::JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_config_user_id ON config(user_id);

-- ============================================
-- HISTORY TABLE
-- ============================================
CREATE TABLE history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name VARCHAR(255),
  brand VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  service VARCHAR(255) NOT NULL,
  part_cost DECIMAL(10,2) NOT NULL CHECK (part_cost >= 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('ARS', 'USD')),
  final_price DECIMAL(10,2) NOT NULL CHECK (final_price >= 0),
  breakdown JSONB NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Indexes for fast history searches and filtering
CREATE INDEX idx_history_date ON history(date DESC);
CREATE INDEX idx_history_client_name ON history(client_name);
CREATE INDEX idx_history_brand ON history(brand);
CREATE INDEX idx_history_model ON history(model);
CREATE INDEX idx_history_service ON history(service);

-- Composite index for common filter combinations
CREATE INDEX idx_history_brand_model ON history(brand, model);

-- ============================================
-- PART TYPES TABLE
-- ============================================
-- Per-user repair part categories (e.g. Pantalla, Batería).
-- UNIQUE(user_id, name) is required for upsert onConflict: 'user_id,name'.
CREATE TABLE part_types (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT part_types_user_name_key UNIQUE (user_id, name)
);

CREATE INDEX idx_part_types_user_id ON part_types(user_id);

-- ============================================
-- SUPPLIER_PRICES TABLE
-- ============================================
-- Phase 2: Tracks part prices from external suppliers.
-- Only admins can write; any authenticated user can read.
CREATE TABLE supplier_prices (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider       VARCHAR(255) NOT NULL,
  part_name      VARCHAR(255) NOT NULL,
  brand          VARCHAR(255) NULL,                         -- device brand (from supplier Excel)
  model          VARCHAR(255) NULL,                         -- device model (from supplier Excel)
  quality        VARCHAR(100) NULL,                         -- part quality tier (from supplier Excel)
  price          NUMERIC      NULL    CHECK (price IS NULL OR price >= 0),  -- base cash price in ARS (Efectivo)
  price_usd      NUMERIC      NULL,                         -- cost in USD (from supplier Excel)
  price_transfer NUMERIC      NULL,                         -- surcharge for bank-transfer payment in ARS
  currency       VARCHAR(3)   NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  last_updated   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_supplier_prices_provider     ON supplier_prices(provider);
CREATE INDEX idx_supplier_prices_part_name    ON supplier_prices(part_name);
CREATE INDEX idx_supplier_prices_last_updated ON supplier_prices(last_updated DESC);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================

-- Function to update updated_at timestamp
-- SET search_path fixes the "mutable search_path" Supabase security warning
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = public;

-- Alias: set_updated_at (same behaviour, alternate name used in some triggers)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = public;

-- Apply trigger to brands
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to models
CREATE TRIGGER update_models_updated_at
  BEFORE UPDATE ON models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to services
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to config
CREATE TRIGGER update_config_updated_at
  BEFORE UPDATE ON config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to part_types
CREATE TRIGGER update_part_types_updated_at
  BEFORE UPDATE ON part_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_updated timestamp (used by supplier_prices)
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = public;

-- Apply last_updated trigger to supplier_prices
CREATE TRIGGER update_supplier_prices_last_updated
  BEFORE UPDATE ON supplier_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated_column();

-- Function to auto-create a profile row when a user signs up.
-- IMPORTANT: wrapped in EXCEPTION block so that any profile creation failure
-- (constraint mismatch, missing table, etc.) only emits a WARNING and never
-- aborts the auth signup transaction (which would return 500 to the client).
-- The client-side ensureProfileOrPurge() in AuthContext self-heals missing rows.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, username, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name',
             NEW.raw_user_meta_data ->> 'name',
             NEW.raw_user_meta_data ->> 'display_name',
             split_part(NEW.email, '@', 1),
             ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url',
             NEW.raw_user_meta_data ->> 'picture',
             NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'username',
             NEW.raw_user_meta_data ->> 'preferred_username',
             split_part(NEW.email, '@', 1)),
    'tecnico'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING
      '[handle_new_user] Could not create profile for user %. Error: % — %',
      NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- Trigger: automatically create a profile row upon auth.users INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to auto-initialize config row with default values when a user signs up.
-- SET search_path fixes the "mutable search_path" Supabase security warning.
CREATE OR REPLACE FUNCTION initialize_user_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.config (user_id, hourly_rate, margin, usd_rate)
  VALUES (NEW.id, 13000, 40, 1200)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- Trigger: automatically create a config row upon auth.users INSERT
DROP TRIGGER IF EXISTS on_auth_user_config_init ON auth.users;
CREATE TRIGGER on_auth_user_config_init
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_config();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands           ENABLE ROW LEVEL SECURITY;
ALTER TABLE models           ENABLE ROW LEVEL SECURITY;
ALTER TABLE services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE config           ENABLE ROW LEVEL SECURITY;
ALTER TABLE history          ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_prices  ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access (for now, adjust for auth later)
-- Brands
CREATE POLICY "Allow public read access on brands"
  ON brands FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on brands"
  ON brands FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on brands"
  ON brands FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on brands"
  ON brands FOR DELETE
  USING (true);

-- Models
CREATE POLICY "Allow public read access on models"
  ON models FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on models"
  ON models FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on models"
  ON models FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on models"
  ON models FOR DELETE
  USING (true);

-- Services
CREATE POLICY "Allow public read access on services"
  ON services FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on services"
  ON services FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on services"
  ON services FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on services"
  ON services FOR DELETE
  USING (true);

-- Config
CREATE POLICY "Allow public read access on config"
  ON config FOR SELECT
  USING (true);

CREATE POLICY "Allow public update on config"
  ON config FOR UPDATE
  USING (true);

-- History
CREATE POLICY "Allow public read access on history"
  ON history FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on history"
  ON history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public delete on history"
  ON history FOR DELETE
  USING (true);

-- Profiles
-- Users can read and edit only their own profile row.
-- The admin check in other policies works because it queries
-- profiles WHERE id = auth.uid(), which always matches this policy.
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Part Types
-- Users can only access their own rows (enforced by RLS + user_id column).
CREATE POLICY "Users can view own part types"
  ON part_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own part types"
  ON part_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own part types"
  ON part_types FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own part types"
  ON part_types FOR DELETE
  USING (auth.uid() = user_id);

-- Supplier Prices
-- Any authenticated user can read. Only admins can write.
CREATE POLICY "Allow authenticated read on supplier_prices"
  ON supplier_prices FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin insert on supplier_prices"
  ON supplier_prices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin update on supplier_prices"
  ON supplier_prices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin delete on supplier_prices"
  ON supplier_prices FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SEED DATA
-- ============================================

-- Note: config rows are created per user on first login, no seed needed.

-- Insert default brands
INSERT INTO brands (id, name) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Samsung'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Apple')
ON CONFLICT (name) DO NOTHING;

-- Insert default services (CATEA "Particular" base prices)
INSERT INTO services (name, hours, base_price, description) VALUES
  ('Cambio de pin de carga Micro USB - V8', 1.0,  24500, 'Reemplazo de puerto clásico.'),
  ('Cambio de pin de carga Micro USB - C',  1.5,  31500, 'Reemplazo de puerto Tipo C.'),
  ('Cambio de Modulo MO (*1)',              1.5,  24500, 'Reemplazo de display LCD/OLED.'),
  ('Cambio de microfono',                  1.0,  24500, 'Reemplazo de micrófono.'),
  ('Cambio de Boton Desarme Simple',        0.5,  14000, 'Reemplazo de flex simple.'),
  ('Flasheo Hard Reset',                   1.0,  10500, 'Reinstalación de OS.'),
  ('FRP (*2)',                             1.5,  17500, 'Desbloqueo de cuenta.'),
  ('Cambio de Componentes SMD No IC',      1.5,  17500, 'Reemplazo de capacitores, diodos, etc.'),
  ('Cambio de IC',                         2.5,  38500, 'Reemplazo de circuitos integrados.'),
  ('Reflow de Componentes de placa Main',  1.5,  17500, 'Resoldado por calor.'),
  ('Cambio de Vidrio No modulo',           2.5,  26600, 'Remoción de visor roto y laminado.'),
  ('Cambio de Camara',                     1.0,  17500, 'Reemplazo de módulo de cámara.'),
  ('Crear cuenta de Google',               0.5,  10500, 'Configuración inicial.'),
  ('Cambio de Bateria',                    0.5,  17500, 'Reemplazo de batería.'),
  ('Diagnostico General',                  0.5,  14000, 'Revisión técnica inicial.'),
  ('Mantenimiento Preventivo: Limpieza',   1.0,  14000, 'Limpieza de hardware.'),
  ('Reparacion de Placa Main',             3.0,  84000, 'Reparación a nivel componente.'),
  ('Reemplazo de Cable Flexible Interno',  1.0,  24500, 'Cambio de flex.'),
  ('Limpieza Virus - Malware',             1.0,  17500, 'Eliminación de software malicioso.'),
  ('Lavado quimico - Equipos Mojados',     2.5,  14000, 'Lavado ultrasónico.'),
  ('Reparación avanzada mediante resoldado...', 3.5, 54486, 'Microelectrónica pesada y reballing.'),
  ('Restablecimiento de Fábrica y Configuración', 1.0, 27243, 'Wipe data y configuración.'),
  ('Cambio de Tapa Trasera',                       2.0, 26600, 'Remoción de cristal trasero (calor/láser) y colocación de tapa nueva.');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get a single profile by user_id
-- SET search_path fixes the "mutable search_path" Supabase security warning
CREATE OR REPLACE FUNCTION get_profile(user_id UUID)
RETURNS TABLE (
  id         UUID,
  username   TEXT,
  full_name  TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, p.full_name, p.avatar_url, p.updated_at, p.created_at
  FROM profiles p
  WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- Function to search profiles by username or full_name
-- SET search_path fixes the "mutable search_path" Supabase security warning
CREATE OR REPLACE FUNCTION search_profiles(search_query TEXT)
RETURNS TABLE (
  id         UUID,
  username   TEXT,
  full_name  TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, p.full_name, p.avatar_url, p.updated_at, p.created_at
  FROM profiles p
  WHERE
    LOWER(p.username) LIKE LOWER('%' || search_query || '%') OR
    LOWER(p.full_name) LIKE LOWER('%' || search_query || '%')
  ORDER BY p.username;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- Function to search brands
CREATE OR REPLACE FUNCTION search_brands(search_query TEXT)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.name, b.created_at, b.updated_at
  FROM brands b
  WHERE LOWER(b.name) LIKE LOWER('%' || search_query || '%')
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;

-- Function to search models
CREATE OR REPLACE FUNCTION search_models(search_query TEXT)
RETURNS TABLE (
  id UUID,
  brand_id UUID,
  name VARCHAR(255),
  risk_factor DECIMAL(3,2),
  category VARCHAR(50),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.brand_id, m.name, m.risk_factor, m.category, m.created_at, m.updated_at
  FROM models m
  WHERE LOWER(m.name) LIKE LOWER('%' || search_query || '%')
  ORDER BY m.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get models with brand name (for easier queries)
CREATE OR REPLACE FUNCTION get_models_with_brand()
RETURNS TABLE (
  id UUID,
  brand_id UUID,
  brand_name VARCHAR(255),
  name VARCHAR(255),
  risk_factor DECIMAL(3,2),
  category VARCHAR(50),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, 
    m.brand_id, 
    b.name AS brand_name,
    m.name, 
    m.risk_factor, 
    m.category, 
    m.created_at, 
    m.updated_at
  FROM models m
  JOIN brands b ON m.brand_id = b.id
  ORDER BY b.name, m.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORAGE BUCKET: price_lists
-- ============================================
-- Phase 3: Private bucket for supplier price list files (PDF, Excel, CSV).
-- Only admins can upload/delete; any authenticated user can download.
--
-- Run this block in the Supabase SQL Editor (Storage schema must be enabled).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'price_lists',
  'price_lists',
  false,       -- private bucket
  52428800,    -- 50 MB per file
  ARRAY[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Only admins can upload files into price_lists
CREATE POLICY "Allow admin upload to price_lists"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'price_lists'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can overwrite/rename files in price_lists
CREATE POLICY "Allow admin update in price_lists"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'price_lists'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete files from price_lists
CREATE POLICY "Allow admin delete from price_lists"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'price_lists'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Any authenticated user can read/download files from price_lists
CREATE POLICY "Allow authenticated read from price_lists"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'price_lists'
    AND auth.role() = 'authenticated'
  );

-- ============================================
-- VIEWS (for easier querying)
-- ============================================

-- View: History with expanded details
CREATE OR REPLACE VIEW history_detailed AS
SELECT 
  h.id,
  h.client_name,
  h.brand,
  h.model,
  h.service,
  h.part_cost,
  h.currency,
  h.final_price,
  h.breakdown,
  h.date,
  h.notes
FROM history h
ORDER BY h.date DESC;

-- ============================================
-- REALTIME PUBLICATION (optional)
-- ============================================

-- Enable realtime for tables if needed
-- ALTER publication supabase_realtime ADD TABLE brands;
-- ALTER publication supabase_realtime ADD TABLE models;
-- ALTER publication supabase_realtime ADD TABLE services;
-- ALTER publication supabase_realtime ADD TABLE config;
-- ALTER publication supabase_realtime ADD TABLE history;

-- ============================================
-- NOTES
-- ============================================
-- 1. Run this script in Supabase SQL Editor
-- 2. UUID extension is required for automatic ID generation
-- 3. All timestamps are in UTC
-- 4. Cascade deletes: deleting a brand deletes its models
-- 5. PROFILES: created automatically via on_auth_user_created trigger on auth.users
-- 6. ROLES: default role is 'tecnico'. Promote manually:
--      UPDATE profiles SET role = 'admin' WHERE id = '<user_uuid>';
-- 7. SUPPLIER_PRICES: authenticated users can read; only 'admin' can write
-- 8. STORAGE bucket 'price_lists': private, admin-write / auth-read
--    If the storage schema INSERT fails, create the bucket via the
--    Supabase Dashboard > Storage > New Bucket (name: price_lists, private)
--    and apply the policies above manually.
