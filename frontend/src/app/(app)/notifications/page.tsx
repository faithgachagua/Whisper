'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, Notice, PageHeader, Spinner } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Notification } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';

export default function NotificationsPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => api<{ items: Notification[] }>('/notifications').then((r) => setItems(r.items)).catch((e) => setError(errMsg(e))), []);
  useEffect(() => { void load(); }, [load]);

  async function markAll() { await api('/notifications/read-all', { method: 'POST' }); setItems((c) => c?.map((n) => ({ ...n, read: true })) ?? null); }
  async function open(n: Notification) { if (!n.read) { await api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined); setItems((c) => c?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null); } }

  return (
    <div className="space-y-4">
      <PageHeader title={t('notif.title')} action={items?.some((n) => !n.read) ? <Button variant="ghost" onClick={markAll}>{t('notif.markAll')}</Button> : undefined} />
      {error && <Notice>{error}</Notice>}
      {!items && !error && <Spinner label={t('common.loading')} />}
      {items?.length === 0 && <EmptyState title={t('notif.empty')} />}
      <ul className="space-y-2">
        {items?.map((n) => {
          const body = (<><p className="text-sm font-semibold">{n.title}</p><p className="text-sm text-ink/70">{n.body}</p><p className="mt-1 text-xs text-ink/45">{timeAgo(n.createdAt, locale)}</p></>);
          const cls = cn('card block p-4', !n.read && 'ring-2 ring-brand-200');
          return <li key={n.id}>{n.link ? <Link href={n.link} onClick={() => open(n)} className={cls}>{body}</Link> : <button onClick={() => open(n)} className={cn(cls, 'w-full text-left')}>{body}</button>}</li>;
        })}
      </ul>
    </div>
  );
}
