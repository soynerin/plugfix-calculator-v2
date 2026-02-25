-- ============================================================
-- Migration: Add repair_details JSONB for multi-repair tickets
-- Version: 0002
-- Date: 2026-02-24
-- ============================================================

-- 1. Add the new column (nullable so existing rows are unaffected)
ALTER TABLE history
  ADD COLUMN IF NOT EXISTS repair_details JSONB;

-- 2. Make the legacy scalar columns nullable so multi-repair inserts
--    can always fall back to the primary/first repair value.
--    (No breaking change — existing rows keep their values.)
ALTER TABLE history
  ALTER COLUMN brand   DROP NOT NULL,
  ALTER COLUMN model   DROP NOT NULL,
  ALTER COLUMN service DROP NOT NULL;

-- 3. Index the JSONB for future full-text or element queries
CREATE INDEX IF NOT EXISTS idx_history_repair_details
  ON history USING GIN (repair_details);

-- 4. (Informational) The repair_details JSONB stores an array of objects:
--
--    [
--      {
--        "brand":     "Samsung",
--        "model":     "Galaxy S23",
--        "service":   "Cambio de Módulo MO (*1)",
--        "partCost":  15,
--        "currency":  "USD",
--        "supplier":  "CellCenter",
--        "breakdown": { ...PriceBreakdown fields... }
--      },
--      ...
--    ]
--
--    Scalar columns brand/model/service still hold the FIRST repair's values
--    so existing filter queries (ilike, eq) continue to work without changes.
