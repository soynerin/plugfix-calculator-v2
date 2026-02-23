import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'tecnico';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** True only while the initial Supabase session check is in flight. */
  loading: boolean;
  /** True while the role is being fetched from the profiles table. */
  roleLoading: boolean;
  /** Role loaded from the profiles table. null while roleLoading or when signed out. */
  role: UserRole | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  roleLoading: false,
  role: null,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  /** Fetch the role from profiles for the given user id. */
  const fetchRole = useCallback(async (userId: string) => {
    setRoleLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle(); // maybeSingle avoids 406 when row is temporarily absent
      setRole((data?.role as UserRole) ?? 'tecnico');
    } finally {
      setRoleLoading(false);
    }
  }, []);

  /**
   * Ensure a profile row exists for the authenticated user.
   *
   * Self-healing strategy:
   *  1. Upsert the profile using the metadata already present in the User
   *     object (full_name, avatar_url, email). ON CONFLICT DO NOTHING keeps
   *     existing data untouched.
   *  2. If the upsert succeeds → the user is valid, return false (no purge).
   *  3. If the upsert fails with a permissions/auth error (401/403) → the JWT
   *     is truly invalid (user deleted from auth.users), force sign-out.
   *
   * This covers two scenarios without false-positives:
   *  a) Google OAuth redirect arrives before the DB trigger commits.
   *  b) Existing users who signed up before the trigger was deployed.
   *
   * Returns `true` only when the session was purged.
   */
  const ensureProfileOrPurge = useCallback(async (authUser: User): Promise<boolean> => {
    const supabase = getSupabaseClient();
    const meta = authUser.user_metadata ?? {};

    const fullName: string =
      meta.full_name || meta.name || meta.display_name ||
      authUser.email?.split('@')[0] || 'Usuario';
    const username: string =
      meta.username || meta.preferred_username || meta.user_name ||
      authUser.email?.split('@')[0] || 'usuario';
    const avatarUrl: string | null = meta.avatar_url || meta.picture || null;

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id:         authUser.id,
          full_name:  fullName,
          username:   username,
          avatar_url: avatarUrl,
          email:      authUser.email ?? null,
          role:       'tecnico',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:        'id',
          ignoreDuplicates:  true, // don't overwrite existing data
        },
      );

    if (error) {
      // A 401/403 means the JWT no longer maps to a valid auth.users row.
      // Any other error (network, etc.) we treat as transient — don't purge.
      const isAuthError = error.code === '401' ||
                          error.code === '403' ||
                          error.message?.toLowerCase().includes('jwt') ||
                          error.message?.toLowerCase().includes('not authenticated');

      if (isAuthError) {
        console.warn('[Auth] JWT inválido — purgando sesión para', authUser.id);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setRole(null);
        return true;
      }

      // Transient error — log but don't purge
      console.warn('[Auth] Error al sincronizar perfil (no crítico):', error.message);
    }

    return false;
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // ── Auth state listener ────────────────────────────────────────────────
    // We rely exclusively on onAuthStateChange. On page load it fires
    // INITIAL_SESSION almost immediately (reads localStorage synchronously
    // then emits), so loading is cleared without any network round-trip.
    // getSession() is intentionally NOT called at startup: in Supabase v2 it
    // awaits the token-refresh network call when the access token is expired,
    // which is exactly what caused the infinite "Verificando sesión..." hang.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        // Fetch role in the background — does not block the loading flag.
        fetchRole(session.user.id);
        // Heal missing profile rows / purge invalid JWTs (fire-and-forget).
        // Only run on explicit sign-in to avoid redundant upserts on every
        // token refresh or page reload.
        if (event === 'SIGNED_IN') {
          ensureProfileOrPurge(session.user);
        }
      } else {
        setSession(null);
        setUser(null);
        setRole(null);
      }
      // Always clear the loading flag once we know the auth state,
      // regardless of whether there is a session or not.
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchRole, ensureProfileOrPurge]);

  return (
    <AuthContext.Provider value={{ user, session, loading, roleLoading, role }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
