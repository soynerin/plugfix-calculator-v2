-- ============================================
-- Migration 0004: Fix signup trigger (exception-safe)
-- ============================================
-- Problem: handle_new_user() runs inside the auth.users INSERT transaction.
-- Any unhandled error (missing table, constraint violation, permission issue,
-- etc.) causes Supabase to return 500 on POST /auth/v1/signup.
--
-- Fix: wrap the INSERT in a BEGIN / EXCEPTION block so that a profile
-- creation failure raises a WARNING instead of aborting the transaction.
-- The client-side ensureProfileOrPurge() in AuthContext.tsx will self-heal
-- any missing profile rows after the user signs in.
-- ============================================

-- ── Diagnostic: inspect current triggers on auth.users (useful to verify) ────
-- SELECT tgname, tgenabled, proname
-- FROM   pg_trigger t
-- JOIN   pg_proc    p ON p.oid = t.tgfoid
-- JOIN   pg_class   c ON c.oid = t.tgrelid
-- JOIN   pg_namespace n ON n.oid = c.relnamespace
-- WHERE  n.nspname = 'auth' AND c.relname = 'users';

-- ── Drop old (unsafe) trigger first ──────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ── Re-create the function with exception handling ────────────────────────────
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
    -- Profile creation must NEVER block an auth signup.
    -- Log the problem so it appears in Supabase's postgres logs,
    -- then let the transaction continue normally.
    RAISE WARNING
      '[handle_new_user] Could not create profile for user %. Error: % — %',
      NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;   -- pin search_path to prevent search-path injection

-- ── Re-attach trigger ─────────────────────────────────────────────────────────
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
