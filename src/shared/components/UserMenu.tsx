import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { getSupabaseClient } from '@/lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? '';
  return b ? (a + b).toUpperCase() : (parts[0]?.slice(0, 2) ?? '??').toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserMenu() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const email = user?.email ?? '';

  // ─── Load profile to get the latest avatar / display name ─────────────────

  useEffect(() => {
    if (!user?.id) return;

    const supabase = getSupabaseClient();
    supabase
      .from('profiles')
      .select('username, full_name, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const name =
          data?.full_name ||
          data?.username ||
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.username as string | undefined) ||
          user.email?.split('@')[0] ||
          'Usuario';

        setDisplayName(name);
        setAvatarUrl(
          data?.avatar_url ||
          (user.user_metadata?.avatar_url as string | undefined) ||
          null,
        );
      });
  }, [user?.id, user?.email, user?.user_metadata]);

  // ─── Close on outside click ────────────────────────────────────────────────

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  // ─── Logout ────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    setIsOpen(false);
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative" ref={menuRef}>
      {/* ── Trigger: avatar circle ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        title="Menú de usuario"
        className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-border hover:ring-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-teal-600 text-white text-sm font-semibold select-none">
            {getInitials(displayName || email.split('@')[0] || '?')}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 z-50 rounded-xl border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
          {/* User info header */}
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>
          </div>

          <div className="border-t border-border" />

          {/* Menu items */}
          <div className="p-1.5">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Mi Perfil
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
