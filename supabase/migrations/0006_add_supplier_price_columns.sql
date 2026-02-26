-- ============================================
-- Migration 0006: Add financial columns to supplier_prices
-- Date: 2026-02-25
-- ============================================
-- Adds two nullable columns to capture extra pricing data from supplier Excel files:
--   price_usd      → part cost in US dollars  (e.g. 9.60)
--   price_transfer → surcharge amount for bank-transfer payments (in ARS)
--
-- The existing `price` column remains the base cash price in ARS (Efectivo).
-- ============================================

ALTER TABLE supplier_prices
  ADD COLUMN IF NOT EXISTS price_usd      NUMERIC      NULL,
  ADD COLUMN IF NOT EXISTS price_transfer NUMERIC      NULL;

-- Optional: document the intent with column comments
COMMENT ON COLUMN supplier_prices.price          IS 'Base price in ARS (cash / Efectivo)';
COMMENT ON COLUMN supplier_prices.price_usd      IS 'Price in USD (nullable, from supplier Excel)';
COMMENT ON COLUMN supplier_prices.price_transfer IS 'Surcharge for bank-transfer payment in ARS (nullable)';
