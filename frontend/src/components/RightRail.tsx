'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { usePresence } from '@/lib/presence';
import type { Community } from '@/lib/types';
import { OnlineDot } from './OnlineDot';
import { Button, ButtonLink } from './ui';

/** Right-hand column on feed pages (wide screens). */
export function RightRail() {
  const { t, locale } = useI18n();
  const { summary } = usePresence();
  const [recs, setRecs] = useState<Community[]>([]);

  useEffect(() => { api<{ items: Community[] }>('/communities').then((r) => setRecs(r.items.filter((c) => !c.joined).slice(0, 4))).catch(() => undefined); }, []);
  async function join(c: Community) {
    try { await api(`/communities/${c.id}/join`, { method: 'POST' }); setRecs((cur) => cur.filter((x) => x.id !== c.id)); } catch { /* ignore */ }
  }

  return (
    <aside className="sticky top-24 hidden w-80 shrink-0 space-y-4 self-start xl:block" aria-label="Suggestions">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
          <p className="font-bold">{t('rail.talk')}</p>
          <p className="mt-1 text-sm text-white/80">{t('rail.talkSub')}</p>
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-white/90"><OnlineDot online={summary.listenersOnline > 0} />{summary.listenersOnline} {t('presence.listeners')}</p>
        </div>
        <div className="p-4"><ButtonLink href="/talk" className="w-full">{t('nav.talk')}</ButtonLink></div>
      </div>

      {recs.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 font-bold text-brand-900">{t('rail.join')}</h2>
          <ul className="space-y-3">
            {recs.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <Link href={`/communities/${c.slug}`} className="min-w-0 truncate text-sm font-semibold hover:underline">{locale === 'sw' ? c.nameSw : c.name}</Link>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => join(c)}>{t('common.join')}</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="px-2 text-xs text-ink/55">{t('rail.emergency')} <Link href="/help" className="font-semibold text-brand-600 underline">{t('nav.help')}</Link></p>
    </aside>
  );
}
