'use client';
import { useCallback, useEffect, useState } from 'react';
import { OnlineDot } from '@/components/OnlineDot';
import { ReportsChart, OnlinePanel } from '@/components/StaffPanels';
import { Notice, PageHeader, Spinner, StatCard } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { timeAgo } from '@/lib/utils';

interface Stats {
  totals: { onlineNow: number; users: number; newThisMonth: number; activeToday: number; posts: number; openReports: number };
  userGrowth: { month: string; users: number }[];
  ageDemographics: { items: { band: string; label: string; count: number; percent: number }[]; suppressed: boolean };
  topCommunities: { id: string; name: string; posts: number; members: number }[];
  safety: { moderationActionsThisMonth: number; usersRestricted: number; urgentOpen: number };
}
interface UserRow { online: boolean; id: string; pseudonym: string; email: string; role: string; status: string; ageTier: string; strikes: number; listener?: { vetted: boolean; youthApproved: boolean } }
interface Log { id: string; actor: string; action: string; createdAt: string }

const COLORS = ['#5F37D1', '#9B7CF7', '#BDA9FF', '#E8497A', '#3A2088', '#D9CEFF', '#7C56E8'];

export default function AdminPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const loadUsers = useCallback(() => api<{ items: UserRow[] }>(`/admin/users?q=${encodeURIComponent(q)}`).then((r) => setUsers(r.items)).catch((e) => setError(errMsg(e))), [q]);
  useEffect(() => {
    if (user?.role !== 'admin') return;
    api<Stats>('/admin/stats').then(setStats).catch((e) => setError(errMsg(e)));
    api<{ items: Log[] }>('/admin/audit-logs').then((r) => setLogs(r.items.slice(0, 10))).catch(() => undefined);
  }, [user]);
  useEffect(() => { if (user?.role === 'admin') { const id = setTimeout(loadUsers, 250); return () => clearTimeout(id); } }, [user, loadUsers]);

  if (user && user.role !== 'admin') return <Notice tone="info">This page is for administrators.</Notice>;
  if (!stats) return error ? <Notice>{error}</Notice> : <Spinner label={t('common.loading')} />;

  async function patch(path: string, body: unknown) { try { await api(path, { method: 'PATCH', body }); await loadUsers(); } catch (e) { setError(errMsg(e)); } }
  const max = Math.max(1, ...stats.userGrowth.map((g) => g.users));
  const demo = stats.ageDemographics.items;
  let acc = 0;
  const conic = demo.map((d, i) => { const from = acc; acc += d.percent; return `${COLORS[i % COLORS.length]} ${from}% ${acc}%`; }).join(', ');

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.title')} sub="Platform overview and management." />
      {error && <Notice>{error}</Notice>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Total users" value={stats.totals.users.toLocaleString()} hint={`+${stats.totals.newThisMonth} this month`} /><StatCard label="Online now" value={stats.totals.onlineNow} /><StatCard label="Active today" value={stats.totals.activeToday} />
        <StatCard label="Total posts" value={stats.totals.posts} /><StatCard label="Open reports" value={stats.totals.openReports} /><StatCard label="Urgent open" value={stats.safety.urgentOpen} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3"><div className="lg:col-span-2"><ReportsChart /></div><OnlinePanel /></div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5"><h2 className="mb-4 font-bold text-brand-900">User growth</h2>
          <div className="flex h-36 items-end gap-3" role="img" aria-label="User growth, last 6 months">{stats.userGrowth.map((g) => (
            <div key={g.month} className="flex flex-1 flex-col items-center gap-1"><span className="text-[10px] text-ink/50">{g.users}</span><div className="w-full rounded-t-lg bg-brand-500" style={{ height: `${Math.max(4, (g.users / max) * 100)}%` }} /><span className="text-xs text-ink/60">{g.month}</span></div>))}</div></section>

        <section className="card p-5"><h2 className="mb-4 font-bold text-brand-900">Age demographics</h2>
          {demo.length === 0 ? <p className="text-sm text-ink/60">Not enough data yet. Groups with fewer than 5 people are hidden to protect privacy.</p> : (
            <div className="flex items-center gap-5"><div className="h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${conic})` }} role="img" aria-label="Age group share"><div className="m-auto mt-[22px] h-[68px] w-[68px] rounded-full bg-white" /></div>
              <ul className="space-y-1 text-xs">{demo.map((d, i) => <li key={d.band} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.label} <span className="text-ink/50">{d.percent}%</span></li>)}</ul></div>)}
          {stats.ageDemographics.suppressed && <p className="mt-3 text-xs text-ink/50">Small groups are combined or hidden to protect privacy.</p>}</section>

        <section className="card p-5"><h2 className="mb-3 font-bold text-brand-900">Top communities</h2><ul className="space-y-2 text-sm">{stats.topCommunities.map((c) => <li key={c.id} className="flex justify-between"><span>{c.name}</span><span className="text-ink/60">{c.posts} posts · {c.members} members</span></li>)}</ul></section>
        <section className="card p-5"><h2 className="mb-3 font-bold text-brand-900">Safety overview</h2><dl className="space-y-2 text-sm"><div className="flex justify-between"><dt>Moderation actions this month</dt><dd className="font-semibold">{stats.safety.moderationActionsThisMonth}</dd></div><div className="flex justify-between"><dt>Users restricted</dt><dd className="font-semibold">{stats.safety.usersRestricted}</dd></div><div className="flex justify-between"><dt>Urgent reports open</dt><dd className="font-semibold">{stats.safety.urgentOpen}</dd></div></dl></section>
      </div>

      <section className="card space-y-3 p-5"><h2 className="font-bold text-brand-900">Users and roles</h2>
        <input className="input" type="search" placeholder="Search username or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-xs text-ink/50"><tr><th className="py-2">User</th><th>Role</th><th>Status</th><th>Listener</th></tr></thead>
          <tbody className="divide-y divide-brand-100">{users.map((u) => (
            <tr key={u.id}><td className="py-2"><p className="flex items-center gap-2 font-semibold"><OnlineDot online={u.online} />{u.pseudonym}</p><p className="text-xs text-ink/50">{u.email} · {u.ageTier}</p></td>
              <td><select aria-label={`Role for ${u.pseudonym}`} className="rounded-lg border border-brand-200 bg-white px-2 py-1 text-xs" value={u.role} onChange={(e) => patch(`/admin/users/${u.id}/role`, { role: e.target.value })}>{['member', 'listener', 'moderator', 'admin'].map((r) => <option key={r}>{r}</option>)}</select></td>
              <td><select aria-label={`Status for ${u.pseudonym}`} className="rounded-lg border border-brand-200 bg-white px-2 py-1 text-xs" value={['active', 'suspended', 'banned'].includes(u.status) ? u.status : 'active'} onChange={(e) => patch(`/admin/users/${u.id}/status`, { status: e.target.value })} disabled={u.id === user?.id}>{['active', 'suspended', 'banned'].map((r) => <option key={r}>{r}</option>)}</select>{u.status === 'restricted' && <span className="ml-2 text-xs text-amber-700">restricted</span>}</td>
              <td className="space-x-3 text-xs">{u.role === 'listener' && u.listener ? (<>
                <label className="inline-flex items-center gap-1"><input type="checkbox" checked={u.listener.vetted} onChange={(e) => patch(`/admin/users/${u.id}/listener`, { vetted: e.target.checked })} />vetted</label>
                <label className="inline-flex items-center gap-1"><input type="checkbox" checked={u.listener.youthApproved} disabled={!u.listener.vetted} onChange={(e) => patch(`/admin/users/${u.id}/listener`, { youthApproved: e.target.checked })} />youth-approved</label></>) : '—'}</td></tr>))}
          </tbody></table></div></section>

      <section className="card p-5"><h2 className="mb-3 font-bold text-brand-900">Recent admin and moderation actions</h2>
        {logs.length === 0 ? <p className="text-sm text-ink/60">Nothing yet.</p> : <ul className="space-y-1.5 text-sm">{logs.map((l) => <li key={l.id} className="flex justify-between gap-3"><span><span className="font-semibold">{l.actor}</span> · {l.action}</span><span className="text-xs text-ink/50">{timeAgo(l.createdAt)}</span></li>)}</ul>}</section>
    </div>
  );
}
