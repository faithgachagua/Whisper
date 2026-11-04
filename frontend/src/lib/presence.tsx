'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { useAuth } from './auth';

interface Summary { onlineNow: number; listenersOnline: number }
const Ctx = createContext<{ summary: Summary }>({ summary: { onlineNow: 0, listenersOnline: 0 } });

/** Pings the API every 30s while the tab is visible, so "online" means "actually here". */
export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary>({ onlineNow: 0, listenersOnline: 0 });
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    const beat = () => {
      if (document.visibilityState !== 'visible') return;
      api<Summary>('/presence/heartbeat', { method: 'POST' }).then((s) => { if (!stopped) setSummary(s); }).catch(() => undefined);
    };
    beat();
    const id = setInterval(beat, 30_000);
    document.addEventListener('visibilitychange', beat);
    return () => { stopped = true; clearInterval(id); document.removeEventListener('visibilitychange', beat); };
  }, [userId]);

  const value = useMemo(() => ({ summary }), [summary]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePresence = () => useContext(Ctx);
