'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, Notice, PageHeader, Spinner, StatCard } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { Conversation, ListenerRequest } from '@/lib/types';

interface Dash { online: boolean; youthApproved: boolean; stats: { todaySessions: number; activeChats: number; pendingRequests: number }; requests: ListenerRequest[] }

export default function ListenerPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [dash, setDash] = useState<Dash | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([api<Dash>('/support/listener/dashboard'), api<{ items: Conversation[] }>('/support/conversations')]);
      setDash(d); setConvs(c.items.filter((x) => x.status === 'open' && x.iAmListener));
    } catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { if (user?.role !== 'listener') return; void load(); const i = setInterval(load, 8000); return () => clearInterval(i); }, [user, load]);

  if (user?.role !== 'listener') return <Notice tone="info">This page is for approved peer listeners.</Notice>;
  if (!dash) return error ? <Notice>{error}</Notice> : <Spinner label={t('common.loading')} />;

  async function toggle() { await api('/support/listener/availability', { method: 'PUT', body: { online: !dash!.online } }); await load(); }
  async function accept(id: string) { try { const r = await api<{ conversationId: string }>(`/support/listener/requests/${id}/accept`, { method: 'POST' }); router.push(`/talk/${r.conversationId}`); } catch (e) { setError(errMsg(e)); await load(); } }
  async function decline(id: string) { await api(`/support/listener/requests/${id}/decline`, { method: 'POST' }); await load(); }

  return (
    <div className="space-y-6">
      <PageHeader title={t('listener.title')} action={<Button variant={dash.online ? 'secondary' : 'primary'} onClick={toggle}>{dash.online ? t('listener.goOffline') : t('listener.goOnline')}</Button>} />
      {error && <Notice>{error}</Notice>}
      <div className={`card flex items-center gap-3 p-4 ${dash.online ? 'bg-emerald-50' : ''}`}><span className={`h-3 w-3 rounded-full ${dash.online ? 'bg-emerald-500' : 'bg-ink/30'}`} aria-hidden /><p className="text-sm font-semibold">{dash.online ? t('listener.online') : t('listener.offline')}</p></div>
      <div className="grid grid-cols-3 gap-3"><StatCard label={t('listener.today')} value={dash.stats.todaySessions} /><StatCard label={t('listener.active')} value={dash.stats.activeChats} /><StatCard label={t('listener.pending')} value={dash.stats.pendingRequests} /></div>

      {convs.length > 0 && <section className="space-y-2"><h2 className="font-bold text-brand-900">{t('listener.active')}</h2>
        {convs.map((c) => <button key={c.id} onClick={() => router.push(`/talk/${c.id}`)} className="card flex w-full items-center justify-between p-4 text-left hover:bg-brand-50"><span className="font-semibold">{c.other.pseudonym} <span className="text-xs font-normal text-ink/50">· {c.other.label}</span></span><span className="text-xs text-brand-600">{t('talk.open')}</span></button>)}</section>}

      <section className="space-y-3"><h2 className="font-bold text-brand-900">{t('listener.requests')}</h2>
        {dash.requests.length === 0 ? <EmptyState title={t('listener.none')} /> : dash.requests.map((r) => (
          <div key={r.id} className="card flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{r.requester}</p><p className="text-xs text-ink/60">{r.topics.join(', ').replace(/_/g, ' ')} · {r.waitingMinutes} min</p></div>
            <Button className="px-4 py-2" onClick={() => accept(r.id)}>{t('listener.accept')}</Button>
            <Button variant="secondary" className="px-4 py-2" onClick={() => decline(r.id)}>{t('listener.decline')}</Button>
          </div>
        ))}</section>
    </div>
  );
}
