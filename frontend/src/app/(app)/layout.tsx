'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    // Moderators only get their own dashboard (plus notifications and the safety help page).
    if (user.role === 'moderator') {
      if (!['/moderator', '/notifications', '/help'].some((p) => pathname === p || pathname.startsWith(`${p}/`))) router.replace('/moderator');
      return;
    }
    if (!user.onboarded) router.replace('/onboarding');
  }, [user, loading, router, pathname]);

  const modOk = user?.role === 'moderator' && ['/moderator', '/notifications', '/help'].some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (loading || !user || (user.role === 'moderator' ? !modOk : !user.onboarded)) return <Spinner label="…" />;
  return <AppShell>{children}</AppShell>;
}
