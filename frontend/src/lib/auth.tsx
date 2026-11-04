'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => void;
  setUser: (u: User) => void;
  refresh: () => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); setLoading(false); return; }
    try {
      const { user } = await api<{ user: User }>('/auth/me');
      setUser(user);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const value = useMemo<AuthState>(() => ({
    user, loading, setUser, refresh,
    signIn: (token, u) => { tokenStore.set(token); setUser(u); },
    signOut: () => { tokenStore.clear(); setUser(null); },
  }), [user, loading, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
