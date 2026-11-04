'use client';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { usePresence } from '@/lib/presence';
import { cn } from '@/lib/utils';

export function OnlineDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span role="img" aria-label={online ? 'Online' : 'Offline'}
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', online ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]' : 'bg-ink/25', className)} />
  );
}

/** Total online, shown in the top bar to moderators and admins only. */
export function OnlineCount() {
  const { summary } = usePresence();
  const { user } = useAuth();
  const { t } = useI18n();
  if (user?.role !== 'moderator' && user?.role !== 'admin') return null;
  return (
    <span className="hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 sm:inline-flex">
      <OnlineDot online />{summary.onlineNow} {t('presence.onlineNow')}
    </span>
  );
}
