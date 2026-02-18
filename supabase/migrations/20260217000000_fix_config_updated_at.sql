-- ============================================
-- Migration: Fix config table updated_at column
-- Date: 2026-02-17
-- Description: Rename last_updated to updated_at for consistency
-- ============================================

-- Rename column in config table
ALTER TABLE config 
  RENAME COLUMN last_updated TO updated_at;

-- The trigger update_config_updated_at already exists and will now work correctly
