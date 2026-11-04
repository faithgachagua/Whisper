'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { OnlineDot } from './OnlineDot';

interface ReportStats {
  daily: { date: string; filed: number; resolved: number }[];
  byReason: { reason: string; count: number }[];
  totals: { open: number; resolved: number; dismissed: number };
}

/** Complaints graph for moderators and admins. */
export function ReportsChart() {
  const [d, setD] = useState<ReportStats | null>(null);
  useEffect(() => { api<ReportStats>('/moderation/report-stats').then(setD).catch(() => undefined); }, []);
  if (!d) return null;
  const max = Math.max(1, ...d.daily.flatMap((x) => [x.filed, x.resolved]));
  const maxReason = Math.max(1, ...d.byReason.map((r) => r.count));
  const px = (n: number) => (n === 0 ? 0 : Math.max(4, Math.round((n / max) * 110)));

  return (
    <section className="card space-y-5 p-5" aria-label="Complaints">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-brand-900">Complaints, last 14 days</h2>
        <div className="flex gap-4 text-xs text-ink/70">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand-500" />Filed</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Resolved</span>
        </div>
      </div>
      <div className="flex h-36 items-end gap-1.5" role="img" aria-label={`Complaints filed per day: ${d.daily.map((x) => `${x.date} ${x.filed}`).join(', ')}`}>
        {d.daily.map((x) => (
          <div key={x.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${x.date}: ${x.filed} filed, ${x.resolved} resolved`}>
            <div className="flex items-end gap-0.5">
              <div className="w-2 rounded-t bg-brand-500 sm:w-3" style={{ height: px(x.filed) }} />
              <div className="w-2 rounded-t bg-emerald-500 sm:w-3" style={{ height: px(x.resolved) }} />
            </div>
            <span className="text-[10px] text-ink/50">{x.date.slice(8)}</span>
          </div>
        ))}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold text-brand-900">By reason</h3>
        {d.byReason.length === 0 ? <p className="text-sm text-ink/60">No complaints yet.</p> : (
          <ul className="space-y-2">
            {d.byReason.map((r) => (
              <li key={r.reason} className="text-xs">
                <div className="mb-1 flex justify-between"><span className="font-medium capitalize">{r.reason.replace(/_/g, ' ')}</span><span className="text-ink/60">{r.count}</span></div>
                <div className="h-2 rounded-full bg-brand-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(r.count / maxReason) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface Online { total: number; byRole: Record<string, number>; items: { pseudonym: string; role: string; group: string }[] }

/** Everyone online right now. Visible to moderators and admins only. */
export function OnlinePanel() {
  const [d, setD] = useState<Online | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const load = () => api<Online>('/moderation/online').then(setD).catch(() => undefined);
    void load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);
  if (!d) return null;

  return (
    <section className="card space-y-3 p-5" aria-label="People online">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-brand-900"><OnlineDot online={d.total > 0} />{d.total} online now</h2>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-xs font-semibold text-brand-600 hover:underline">{open ? 'Hide list' : 'Show who'}</button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(d.byRole).map(([role, n]) => <span key={role} className="rounded-full bg-brand-100 px-3 py-1 font-semibold capitalize text-brand-700">{n} {role}{n === 1 ? '' : 's'}</span>)}
      </div>
      {open && (d.items.length === 0 ? <p className="text-sm text-ink/60">Nobody is online.</p> : (
        <ul className="max-h-56 divide-y divide-brand-100 overflow-y-auto text-sm">
          {d.items.map((u) => <li key={u.pseudonym} className="flex items-center justify-between gap-3 py-2"><span className="flex items-center gap-2 font-medium"><OnlineDot online />{u.pseudonym}</span><span className={cn('text-xs text-ink/55 capitalize')}>{u.role} · {u.group}</span></li>)}
        </ul>
      ))}
    </section>
  );
}
