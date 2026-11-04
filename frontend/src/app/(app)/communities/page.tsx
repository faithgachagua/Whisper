'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState, Notice, PageHeader, Spinner } from '@/components/ui';
import { Button } from '@/components/ui';
import { OnlineDot } from '@/components/OnlineDot';
import { api, errMsg } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Community } from '@/lib/types';
import { compact } from '@/lib/utils';

export default function CommunitiesPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Community[] | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api<{ items: Community[] }>('/communities').then((r) => setItems(r.items)).catch((e) => setError(errMsg(e))); }, []);

  async function toggle(c: Community) {
    try {
      const r = await api<{ community: Community }>(`/communities/${c.id}/${c.joined ? 'leave' : 'join'}`, { method: 'POST' });
      setItems((cur) => cur?.map((x) => (x.id === c.id ? r.community : x)) ?? null);
    } catch (e) { setError(errMsg(e)); }
  }

  const shown = items?.filter((c) => `${c.name} ${c.nameSw}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title={t('comm.title')} />
      <input className="input mb-5" type="search" placeholder={t('comm.search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('comm.search')} />
      {error && <Notice>{error}</Notice>}
      {!items && !error && <Spinner label={t('common.loading')} />}
      {shown && shown.length === 0 && <EmptyState title={t('search.none')} />}
      <ul className="space-y-3">
        {shown?.map((c) => (
          <li key={c.id} className="card flex items-center gap-4 p-4">
            <Link href={`/communities/${c.slug}`} className="min-w-0 flex-1">
              <p className="font-bold text-brand-900">{locale === 'sw' ? c.nameSw : c.name}</p>
              <p className="truncate text-sm text-ink/60">{locale === 'sw' ? c.descriptionSw : c.description}</p>
              <p className="mt-1 text-xs text-ink/50">{compact(c.memberCount)} {t('common.members')}{c.activeNow > 0 && <span className="ml-2 inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300"><OnlineDot online />{c.activeNow} {t('presence.activeNow')}</span>}</p>
            </Link>
            <Button variant={c.joined ? 'secondary' : 'primary'} className="px-4 py-2" onClick={() => toggle(c)}>{c.joined ? t('common.joined') : t('common.join')}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
