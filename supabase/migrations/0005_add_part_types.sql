-- ============================================
-- Migration 0005: Fix part_types unique constraint
-- ============================================
-- The part_types table already exists but is missing the UNIQUE(user_id, name)
-- constraint required by SupabaseAdapter.initialize(), which calls:
--   supabase.from('part_types').upsert(..., { onConflict: 'user_id,name' })
-- Without this constraint Supabase returns 400 Bad Request on that upsert.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

ALTER TABLE public.part_types
  ADD CONSTRAINT part_types_user_name_key UNIQUE (user_id, name);
