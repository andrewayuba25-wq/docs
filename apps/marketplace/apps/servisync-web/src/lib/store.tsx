import {
  createContext, useContext, useEffect, useMemo, useState,
} from 'react';
import { mutations, queries, subscribe } from './db';
import type { User } from './types';

// ---- Reactive DB hook -------------------------------------------------------

// Re-render any component on DB change so the local "backend" feels live.
export function useDbVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => subscribe(() => setV((n) => n + 1)), []);
  return v;
}

// ---- Session ----------------------------------------------------------------

const SESSION_KEY = 'servisync.session.userId';

type Theme = 'light' | 'dark';

interface SessionCtx {
  user: User | null;
  theme: Theme;
  login: (phone: string, role: 'customer' | 'artisan') => User;
  logout: () => void;
  toggleTheme: () => void;
  refresh: () => void;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const dbVersion = useDbVersion(); // re-render when DB mutates
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('servisync.theme') as Theme) ||
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('servisync.theme', theme);
  }, [theme]);

  // Recompute on userId OR any DB mutation so role/name/avatar changes propagate.
  const user = useMemo(
    () => (userId ? queries.userById(userId) ?? null : null),
    [userId, dbVersion],
  );

  const value: SessionCtx = {
    user,
    theme,
    login: (phone, role) => {
      const u = mutations.loginOrCreate(phone, role);
      localStorage.setItem(SESSION_KEY, u.id);
      setUserId(u.id);
      return u;
    },
    logout: () => {
      localStorage.removeItem(SESSION_KEY);
      setUserId(null);
    },
    toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    refresh: () => setUserId((id) => id),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
