-- ============================================
-- Migration 0003: Roles, Supplier Prices & Storage
-- ============================================
-- Run this on an EXISTING database that already has the base schema.
-- If you are running schema.sql from scratch, skip this file.

-- ============================================
-- PHASE 1: PROFILES TABLE
-- ============================================
-- If profiles table does not yet exist, create it.
CREATE TABLE IF NOT EXISTS profiles (
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

-- If profiles already exists but is missing the role column, add it:
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'tecnico'
    CONSTRAINT profiles_role_check
      CHECK (role = ANY (ARRAY['admin', 'tecnico']));

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role     ON profiles(id, role);

-- Timestamp trigger for profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- Auto-create profile on new user signup
-- IMPORTANT: wrapped in EXCEPTION block so that profile creation failures
-- never abort the auth signup transaction (500 on POST /auth/v1/signup).
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- PHASE 2: SUPPLIER_PRICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS supplier_prices (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider     VARCHAR(255) NOT NULL,
  part_name    VARCHAR(255) NOT NULL,
  price        NUMERIC      NOT NULL CHECK (price >= 0),
  currency     VARCHAR(3)   NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  last_updated TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_prices_provider     ON supplier_prices(provider);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_part_name    ON supplier_prices(part_name);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_last_updated ON supplier_prices(last_updated DESC);

-- Function + trigger to auto-update last_updated on UPDATE
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_supplier_prices_last_updated'
  ) THEN
    CREATE TRIGGER update_supplier_prices_last_updated
      BEFORE UPDATE ON supplier_prices
      FOR EACH ROW
      EXECUTE FUNCTION update_last_updated_column();
  END IF;
END;
$$;

-- Enable RLS
ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;

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
-- PHASE 3: STORAGE BUCKET price_lists
-- ============================================
-- Creates the private bucket for supplier price-list files.
-- If the INSERT fails (storage schema not enabled), create the bucket
-- via Dashboard > Storage > New Bucket and apply the policies below manually.

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

-- Storage RLS policies
CREATE POLICY "Allow admin upload to price_lists"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'price_lists'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin update in price_lists"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'price_lists'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin delete from price_lists"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'price_lists'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow authenticated read from price_lists"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'price_lists'
    AND auth.role() = 'authenticated'
  );
