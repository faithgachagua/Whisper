'use client';
import { useParams, useRouter } from 'next/navigation';
import { Ban, Flag, LogOut, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OnlineDot } from '@/components/OnlineDot';
import { ReportDialog } from '@/components/ReportDialog';
import { SafetyCard } from '@/components/SafetyCard';
import { Button, Notice, Spinner } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Conversation, Message, SafetyPayload } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hint, setHint] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [safety, setSafety] = useState<SafetyPayload | null>(null);
  const [report, setReport] = useState(false);
  const last = useRef('');
  const bottom = useRef<HTMLDivElement>(null);

  const fetchNew = useCallback(async () => {
    try {
      const r = await api<{ conversation: Conversation; messages: Message[]; escalationHint: boolean }>(`/support/conversations/${id}?after=${encodeURIComponent(last.current)}`);
      setConv(r.conversation); setHint(r.escalationHint);
      if (r.messages.length) {
        last.current = r.messages[r.messages.length - 1].createdAt;
        setMessages((cur) => [...cur, ...r.messages.filter((m) => !cur.some((c) => c.id === m.id))]);
      }
    } catch (e) { setError(errMsg(e)); }
  }, [id]);

  useEffect(() => { void fetchNew(); const i = setInterval(fetchNew, 4000); return () => clearInterval(i); }, [fetchNew]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    try {
      const r = await api<{ message: Message; safety: SafetyPayload | null }>(`/support/conversations/${id}/messages`, { body: { body: text } });
      last.current = r.message.createdAt;
      setMessages((cur) => [...cur, r.message]); setText(''); if (r.safety) setSafety(r.safety);
    } catch (err) { setError(errMsg(err)); }
  }

  async function leave() { await api(`/support/conversations/${id}/leave`, { method: 'POST' }).catch(() => undefined); router.push('/talk'); }
  async function block() {
    if (!conv?.other.id || !confirm('Block this person? You will not be matched again.')) return;
    await api(`/users/${conv.other.id}/block`, { body: { kind: 'block' } }).catch(() => undefined);
    await leave();
  }

  if (!conv) return error ? <Notice>{error}</Notice> : <Spinner label={t('common.loading')} />;
  const closed = conv.status === 'closed';

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col lg:h-[calc(100vh-8rem)]">
      <header className="card mb-3 flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1"><p className="flex items-center gap-2 truncate font-bold"><OnlineDot online={!!conv.other.online} />{conv.other.pseudonym}</p><p className="text-xs text-ink/55">{conv.other.label} · {conv.other.online ? t('presence.online') : conv.other.lastSeenAt ? `${t('presence.lastActive')} ${timeAgo(conv.other.lastSeenAt, locale)}` : ''}</p></div>
        <button onClick={() => setReport(true)} aria-label={t('common.report')} className="rounded-lg p-2 text-ink/60 hover:bg-brand-50"><Flag className="h-4 w-4" /></button>
        <button onClick={block} aria-label={t('common.block')} className="rounded-lg p-2 text-ink/60 hover:bg-brand-50"><Ban className="h-4 w-4" /></button>
        <button onClick={leave} aria-label={t('talk.leave')} className="rounded-lg p-2 text-ink/60 hover:bg-brand-50"><LogOut className="h-4 w-4" /></button>
      </header>
      {!conv.iAmListener && <p className="mb-2 text-center text-xs text-ink/50">{t('talk.disclaimer')}</p>}
      {hint && <div className="mb-2"><Notice tone="info">This member may be in distress. Follow the escalation steps: stay with them, share the helplines in Help and Safety, and tell a moderator.</Notice></div>}

      <div className="flex-1 space-y-2 overflow-y-auto rounded-card bg-white/60 p-4" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
            <p className={cn('max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm', m.mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-white text-ink shadow-card')}>{m.body}</p>
          </div>
        ))}
        {safety && <SafetyCard safety={safety} />}
        <div ref={bottom} />
      </div>

      {error && <div className="mt-2"><Notice>{error}</Notice></div>}
      {closed ? <p className="mt-3 text-center text-sm text-ink/60">{t('talk.ended')}</p> : (
        <form onSubmit={send} className="mt-3 flex gap-2">
          <input className="input" value={text} maxLength={1000} placeholder={t('talk.typeMessage')} onChange={(e) => setText(e.target.value)} aria-label={t('talk.typeMessage')} />
          <Button type="submit" aria-label={t('common.send')} disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
        </form>
      )}
      {report && <ReportDialog targetType="conversation" targetId={id} onClose={() => setReport(false)} />}
    </div>
  );
}
