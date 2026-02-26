-- ============================================
-- Migration 0007: Add brand, model, quality to supplier_prices
--                 and relax price NOT NULL constraint
-- Date: 2026-02-25
-- ============================================
-- Context: The Excel bulk-import flow extracts per-device rows that
--          each carry a brand, model, and quality level. These fields
--          did not exist in the original table design.
--
-- Also relaxes `price` to allow NULL so rows where only the USD price
-- is present (e.g. imported parts quoted exclusively in dollars) can be
-- stored without forcing a placeholder value.
-- ============================================

-- 1. Add the three new columns (idempotent)
ALTER TABLE supplier_prices
  ADD COLUMN IF NOT EXISTS brand   VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS model   VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS quality VARCHAR(100) NULL;

-- 2. Make price nullable (some rows may only carry a USD price)
ALTER TABLE supplier_prices
  ALTER COLUMN price DROP NOT NULL;

-- 3. Optional column comments for documentation
COMMENT ON COLUMN supplier_prices.brand   IS 'Device brand extracted from supplier Excel (e.g. Samsung, Apple)';
COMMENT ON COLUMN supplier_prices.model   IS 'Device model extracted from supplier Excel (e.g. Galaxy S24)';
COMMENT ON COLUMN supplier_prices.quality IS 'Part quality tier from supplier Excel (e.g. Original, Compatible, Estándar)';
