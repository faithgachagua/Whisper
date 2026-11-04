'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Headphones, Heart, LayoutDashboard, LifeBuoy, LogOut, MessageCircleHeart, Search, Settings, ShieldCheck, SquarePen, BarChart3, UserRound, Users, Home } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/messages/en';
import { cn } from '@/lib/utils';
import { LanguageToggle } from './LanguageToggle';
import { OnlineCount } from './OnlineDot';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
import { Avatar } from './ui';

interface NavItem { href: string; key: MessageKey; icon: typeof Home }
const MAIN: NavItem[] = [
  { href: '/home', key: 'nav.home', icon: Home }, { href: '/communities', key: 'nav.communities', icon: Users },
  { href: '/talk', key: 'nav.talk', icon: MessageCircleHeart }, { href: '/share', key: 'nav.share', icon: SquarePen }, { href: '/my-space', key: 'nav.mySpace', icon: UserRound },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () => api<{ unread: number }>('/notifications').then((r) => alive && setUnread(r.unread)).catch(() => undefined);
    void load();
    const id = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [pathname]);

  if (!user) return null;
  const extra: NavItem[] = [
    { href: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
    ...(user.role === 'listener' ? [{ href: '/listener', key: 'nav.listener' as const, icon: Headphones }] : []),
    ...(user.role === 'moderator' || user.role === 'admin' ? [{ href: '/moderator', key: 'nav.moderation' as const, icon: ShieldCheck }] : []),
    ...(user.role === 'admin' ? [{ href: '/admin', key: 'nav.admin' as const, icon: BarChart3 }] : []),
    { href: '/help', key: 'nav.help', icon: LifeBuoy },
    { href: '/my-space', key: 'nav.settings', icon: Settings },
  ];
  const isMod = user.role === 'moderator';
  const main = isMod ? [{ href: '/moderator', key: 'nav.moderation' as const, icon: ShieldCheck }] : MAIN;
  const extraItems = isMod ? [] : extra;
  const home = isMod ? '/moderator' : '/home';
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-brand-900 p-5 text-white lg:flex">
        <Link href={home} className="mb-8 px-2"><Logo dark /></Link>
        <nav aria-label="Main" className="space-y-1">
          {main.map(({ href, key, icon: Icon }) => (
            <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
              className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', active(href) ? 'bg-brand-600 text-white' : 'text-brand-100 hover:bg-white/10')}>
              <Icon className="h-5 w-5" aria-hidden />{t(key)}
            </Link>
          ))}
        </nav>
        {extraItems.length > 0 && <div className="mt-6 space-y-1 border-t border-white/10 pt-4">
          {extraItems.map(({ href, key, icon: Icon }) => (
            <Link key={key} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-brand-200 hover:bg-white/10"><Icon className="h-4 w-4" aria-hidden />{t(key)}</Link>
          ))}
        </div>}
        <div className="mt-auto rounded-2xl bg-white/10 p-4">
          <Heart className="mb-2 h-5 w-5 text-brand-300" aria-hidden />
          <p className="text-sm font-semibold">{t('shell.notAlone')}</p>
          <p className="mt-1 text-xs text-brand-200">{t('shell.always')}</p>
        </div>
      </aside>

      <div className={cn('flex min-w-0 flex-1 flex-col lg:pb-0', !isMod && 'pb-20')}>
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-brand-100 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <Link href={home} className="lg:hidden"><Logo className="[&>span]:text-xl" /></Link>
          {!isMod && <Link href="/search" className="hidden flex-1 items-center gap-2 rounded-xl bg-canvas px-4 py-2.5 text-sm text-ink/50 ring-1 ring-brand-100 lg:flex lg:max-w-md">
            <Search className="h-4 w-4" aria-hidden />{t('home.search')}
          </Link>}
          <span className={isMod ? 'flex-1' : 'flex-1 lg:hidden'} />
          {!isMod && <Link href="/search" aria-label={t('nav.search')} className="rounded-full p-2 text-brand-700 hover:bg-brand-50 lg:hidden"><Search className="h-5 w-5" /></Link>}
          <Link href="/notifications" aria-label={t('nav.notifications')} className="relative rounded-full p-2 text-brand-700 hover:bg-brand-50">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-whisper px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
          </Link>
          <OnlineCount />
          <ThemeToggle />
          <LanguageToggle className="hidden sm:inline-flex" />
          {isMod ? <Avatar name={user.pseudonym} size="sm" online={user.showOnline !== false} /> : <Link href="/my-space" aria-label={t('nav.mySpace')}><Avatar name={user.pseudonym} size="sm" online={user.showOnline !== false} /></Link>}
          <button onClick={() => { signOut(); router.replace('/login'); }} aria-label={t('common.logout')} className={cn('rounded-full p-2 text-ink/50 hover:bg-brand-50', !isMod && 'hidden lg:block')}><LogOut className="h-5 w-5" /></button>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>

      {/* Mobile bottom tabs */}
      {!isMod && <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-brand-100 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {main.map(({ href, key, icon: Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
            className={cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', active(href) ? 'text-brand-600' : 'text-ink/50')}>
            <Icon className="h-5 w-5" aria-hidden /><span className="max-w-full truncate px-1">{t(key)}</span>
          </Link>
        ))}
      </nav>}
    </div>
  );
}
