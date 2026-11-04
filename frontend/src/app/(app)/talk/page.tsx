'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { OnlineDot } from '@/components/OnlineDot';
import { usePresence } from '@/lib/presence';
import { Button, Chip, EmptyState, Notice, PageHeader, Spinner } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { SUPPORT_TOPICS } from '@/lib/communities';
import { useI18n } from '@/lib/i18n';
import type { Conversation } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

interface MyRequest { id: string; status: 'pending' | 'matched'; conversationId: string | null; waitingMinutes: number }

export default function TalkPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { summary } = usePresence();
  const [topics, setTopics] = useState<string[]>([]);
  const [request, setRequest] = useState<MyRequest | null | undefined>(undefined);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const poll = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([api<{ request: MyRequest | null }>('/support/requests/mine'), api<{ items: Conversation[] }>('/support/conversations')]);
      setRequest(r.request); setConvs(c.items);
      if (r.request?.conversationId) router.push(`/talk/${r.request.conversationId}`);
    } catch (e) { setError(errMsg(e)); }
  }, [router]);

  useEffect(() => {
    void poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [poll]);

  async function find() {
    setBusy(true); setError('');
    try { await api('/support/requests', { body: { topics } }); await poll(); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }
  async function cancel() {
    if (!request) return;
    await api(`/support/requests/${request.id}/cancel`, { method: 'POST' }).catch(() => undefined);
    setRequest(null);
  }

  if (request === undefined && !error) return <Spinner label={t('common.loading')} />;
  const open = convs.filter((c) => c.status === 'open');

  return (
    <div className="space-y-6">
      <PageHeader title={t('talk.title')} sub={t('talk.sub')} />
      {error && <Notice>{error}</Notice>}
      <p className="flex items-center gap-2 text-sm font-medium text-ink/70"><OnlineDot online={summary.listenersOnline > 0} />{summary.listenersOnline} {t('presence.listeners')}</p>

      {open.length > 0 && (
        <section aria-label={t('talk.yours')} className="space-y-2">
          <h2 className="text-sm font-bold text-brand-900">{t('talk.yours')}</h2>
          {open.map((c) => (
            <Link key={c.id} href={`/talk/${c.id}`} className="card flex items-center justify-between p-4 hover:bg-brand-50">
              <div><p className="font-semibold">{c.other.pseudonym} <span className="text-xs font-normal text-ink/50">· {c.other.label}</span></p>
                <p className="text-sm text-ink/60">{c.lastMessage?.body ?? '…'}</p></div>
              <span className="text-xs text-ink/50">{timeAgo(c.lastMessage?.createdAt ?? c.createdAt, locale)}</span>
            </Link>
          ))}
        </section>
      )}

      {request?.status === 'pending' ? (
        <div className="card space-y-4 p-6 text-center" role="status">
          <Spinner label={t('talk.waiting')} />
          <p className="text-sm text-ink/60">{t('talk.waitingSub')}</p>
          <Button variant="secondary" onClick={cancel}>{t('talk.cancel')}</Button>
        </div>
      ) : (
        <div className="card space-y-6 p-6">
          <section><h2 className="mb-3 font-bold text-brand-900">{t('talk.need')}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SUPPORT_TOPICS.map((s) => <Chip key={s.id} active={topics.includes(s.id)} onClick={() => setTopics((cur) => (cur.includes(s.id) ? cur.filter((x) => x !== s.id) : [...cur, s.id].slice(0, 5)))}>{locale === 'sw' ? s.sw : s.en}</Chip>)}
            </div>
          </section>
          <section><h2 className="mb-3 font-bold text-brand-900">{t('talk.how')}</h2>
            <div className="grid grid-cols-2 gap-2"><Chip active>{t('talk.text')}</Chip><Chip disabled>{t('talk.voice')}</Chip></div>
          </section>
          <Button className="w-full py-3.5" loading={busy} disabled={topics.length === 0} onClick={find}>{t('talk.find')}</Button>
          <p className="text-center text-xs text-ink/60">{t('talk.disclaimer')} <Link href="/help" className="font-semibold text-brand-600 underline">{t('nav.help')}</Link></p>
        </div>
      )}
      {convs.length === 0 && !request && <EmptyState title={t('talk.privacy')} />}
    </div>
  );
}
