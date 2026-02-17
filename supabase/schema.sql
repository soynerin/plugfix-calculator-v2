-- ============================================
-- PlugFix Calculator - Supabase Schema
-- Version: 1.0
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast service lookups
CREATE INDEX idx_services_name ON services(name);

-- ============================================
-- CONFIG TABLE (Singleton)
-- ============================================
CREATE TABLE config (
  id VARCHAR(10) PRIMARY KEY CHECK (id = 'main'),
  hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate > 0),
  margin DECIMAL(5,2) NOT NULL CHECK (margin >= 0 AND margin <= 100),
  usd_rate DECIMAL(10,2) NOT NULL CHECK (usd_rate > 0),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one config row exists
CREATE UNIQUE INDEX idx_config_singleton ON config(id);

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
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default config
INSERT INTO config (id, hourly_rate, margin, usd_rate)
VALUES ('main', 13000, 40, 1200)
ON CONFLICT (id) DO NOTHING;

-- Insert default brands
INSERT INTO brands (id, name) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Samsung'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Apple')
ON CONFLICT (name) DO NOTHING;

-- Insert default services
INSERT INTO services (id, name, hours) VALUES
  ('660e8400-e29b-41d4-a716-446655440000', 'Cambio de Pantalla', 1.0),
  ('660e8400-e29b-41d4-a716-446655440001', 'Cambio de Batería', 0.5),
  ('660e8400-e29b-41d4-a716-446655440002', 'Conector de Carga', 0.75)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

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
-- 2. RLS policies are set to public for now - adjust for authentication
-- 3. UUID extension is required for automatic ID generation
-- 4. All timestamps are in UTC
-- 5. Cascade deletes: deleting a brand deletes its models
