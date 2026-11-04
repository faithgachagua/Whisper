'use client';
import { useCallback, useEffect, useState } from 'react';
import { ReportsChart, OnlinePanel } from '@/components/StaffPanels';
import { Button, EmptyState, Notice, PageHeader, Spinner, StatCard } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { cn, timeAgo } from '@/lib/utils';

interface Row { id: string; targetType: string; reason: string; priority: 'normal' | 'urgent'; status: string; createdAt: string; source: string; preview: string }
interface Detail {
  report: Row & { details: string }; content: string;
  messages: { id: string; body: string; sender: string; flagged: boolean }[];
  subject: { pseudonym: string; status: string; strikes: number; group: string; role: string } | null; priorReports: number;
}

const ACTIONS: Array<{ id: string; label: string; admin?: boolean; crisis?: boolean; notCrisis?: boolean; danger?: boolean }> = [
  { id: 'dismiss', label: 'Dismiss', crisis: true }, { id: 'send_support_resources', label: 'Send support resources', crisis: true },
  { id: 'remove_content', label: 'Remove content', notCrisis: true }, { id: 'warn', label: 'Warn', notCrisis: true },
  { id: 'restrict', label: 'Restrict 7 days', notCrisis: true }, { id: 'suspend', label: 'Suspend', notCrisis: true, danger: true },
  { id: 'ban', label: 'Ban (admin)', notCrisis: true, admin: true, danger: true },
];

export default function ModeratorPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<{ openReports: number; urgentReports: number; resolvedToday: number; restrictedUsers: number } | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [status, setStatus] = useState<'open' | 'resolved' | 'all'>('open');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([api<NonNullable<typeof stats>>('/moderation/stats'), api<{ items: Row[] }>(`/moderation/reports?status=${status}`)]);
      setStats(s); setRows(r.items);
    } catch (e) { setError(errMsg(e)); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  if (user && user.role !== 'moderator' && user.role !== 'admin') return <Notice tone="info">This page is for moderators.</Notice>;

  async function open(id: string) { setNote(''); setError(''); try { setDetail(await api<Detail>(`/moderation/reports/${id}`)); } catch (e) { setError(errMsg(e)); } }
  async function act(action: string) {
    if (!detail) return;
    try { await api(`/moderation/reports/${detail.report.id}/resolve`, { body: { action, note } }); setDetail(null); await load(); } catch (e) { setError(errMsg(e)); }
  }

  const crisis = detail?.report.reason === 'crisis_language';

  return (
    <div className="space-y-6">
      <PageHeader title={t('mod.title')} sub="Reports, flagged content and safeguarding cases." />
      {error && <Notice>{error}</Notice>}
      {stats && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><StatCard label="Open reports" value={stats.openReports} /><StatCard label="Urgent" value={stats.urgentReports} /><StatCard label="Resolved today" value={stats.resolvedToday} /><StatCard label="Restricted users" value={stats.restrictedUsers} /></div>}
      <div className="grid gap-4 lg:grid-cols-3"><div className="lg:col-span-2"><ReportsChart /></div><OnlinePanel /></div>

      <div className="flex gap-2" role="tablist">{(['open', 'resolved', 'all'] as const).map((s) => <button key={s} role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setDetail(null); }} className={cn('rounded-full px-4 py-1.5 text-sm font-semibold capitalize', status === s ? 'bg-brand-600 text-white' : 'bg-white text-brand-700 ring-1 ring-brand-200')}>{s}</button>)}</div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2" aria-label="Reports">
          {!rows && <Spinner label={t('common.loading')} />}
          {rows?.length === 0 && <EmptyState title="No reports here. Nice and quiet." />}
          {rows?.map((r) => (
            <button key={r.id} onClick={() => open(r.id)} className={cn('card block w-full p-4 text-left hover:bg-brand-50', detail?.report.id === r.id && 'ring-2 ring-brand-400')}>
              <div className="flex items-center gap-2 text-xs"><span className={cn('rounded-full px-2 py-0.5 font-semibold', r.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700')}>{r.priority}</span>
                <span className="font-semibold capitalize">{r.reason.replace(/_/g, ' ')}</span><span className="text-ink/50">· {r.targetType} · {r.source}</span><span className="ml-auto text-ink/45">{timeAgo(r.createdAt)}</span></div>
              {r.preview && <p className="mt-2 line-clamp-2 text-sm text-ink/70">{r.preview}</p>}
            </button>
          ))}
        </section>

        {detail && (
          <section className="card h-fit space-y-4 p-5" aria-label="Report detail">
            <div><p className="text-xs font-semibold uppercase text-ink/50">{detail.report.targetType}</p>
              {detail.content && <p className="mt-1 whitespace-pre-wrap rounded-xl bg-canvas p-3 text-sm">{detail.content}</p>}
              {detail.report.details && <p className="mt-2 text-sm text-ink/70">Reporter note: {detail.report.details}</p>}</div>
            {detail.messages.length > 0 && <ul className="max-h-60 space-y-1.5 overflow-y-auto rounded-xl bg-canvas p-3 text-sm">{detail.messages.map((m) => <li key={m.id} className={m.flagged ? 'font-semibold text-red-700' : ''}><span className="text-xs uppercase text-ink/45">{m.sender}: </span>{m.body}</li>)}</ul>}
            {detail.subject && <p className="text-sm text-ink/70"><span className="font-semibold">{detail.subject.pseudonym}</span> · {detail.subject.group} · {detail.subject.status} · {detail.subject.strikes} strikes · {detail.priorReports} other reports</p>}
            {detail.report.status === 'open' ? (<>
              <textarea className="input min-h-20" placeholder="Note (shown to the member for warnings and removals)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                {ACTIONS.filter((a) => (crisis ? a.crisis : a.notCrisis || a.id === 'dismiss') && (!a.admin || user?.role === 'admin')).map((a) => <Button key={a.id} variant={a.danger ? 'danger' : a.id === 'dismiss' ? 'secondary' : 'primary'} className="px-3 py-2" onClick={() => act(a.id)}>{a.label}</Button>)}
              </div></>) : <Notice tone="info">Handled: {detail.report.status}</Notice>}
          </section>
        )}
      </div>
    </div>
  );
}
