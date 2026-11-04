'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Bookmark, ChevronRight, EyeOff, Languages, LifeBuoy, LogOut, Users, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PostCard } from '@/components/PostCard';
import { Avatar, Button, EmptyState, Field, Notice, PageHeader } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { Community, Post, User } from '@/lib/types';

type Section = null | 'saved' | 'communities' | 'privacy' | 'blocked' | 'language' | 'profile';
interface Blocked { targetId: string; kind: string; pseudonym: string }

export default function MySpacePage() {
  const { t, locale } = useI18n();
  const { user, setUser, signOut } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>(null);
  const [saved, setSaved] = useState<Post[]>([]);
  const [mine, setMine] = useState<Community[]>([]);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [name, setName] = useState(user?.pseudonym ?? '');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    setMsg(null);
    if (section === 'saved') api<{ items: Post[] }>('/posts/saved').then((r) => setSaved(r.items)).catch((e) => setMsg({ tone: 'error', text: errMsg(e) }));
    if (section === 'communities') api<{ items: Community[] }>('/communities/mine').then((r) => setMine(r.items)).catch((e) => setMsg({ tone: 'error', text: errMsg(e) }));
    if (section === 'blocked') api<{ items: Blocked[] }>('/users/me/blocks').then((r) => setBlocked(r.items)).catch((e) => setMsg({ tone: 'error', text: errMsg(e) }));
  }, [section]);

  if (!user) return null;

  async function saveName() {
    try { const r = await api<{ user: User }>('/users/me', { method: 'PATCH', body: { pseudonym: name } }); setUser(r.user); setMsg({ tone: 'success', text: 'Username updated.' }); }
    catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  }
  async function setShowOnline(v: boolean) {
    try { const r = await api<{ user: User }>('/users/me', { method: 'PATCH', body: { showOnline: v } }); setUser(r.user); } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  }
  async function exportData() {
    const data = await api('/users/me/export');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'whisper-data.json'; a.click(); URL.revokeObjectURL(url);
  }
  async function deleteAccount() {
    try { await api('/users/me/delete', { body: { confirm } }); signOut(); router.replace('/'); } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  }

  if (section) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSection(null)} className="text-sm font-semibold text-brand-600">← {t('common.back')}</button>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

        {section === 'saved' && (<><PageHeader title={t('my.saved')} />
          {saved.length === 0 ? <EmptyState title={t('my.noSaved')} /> : saved.map((p) => <PostCard key={p.id} post={p} onChange={(np) => setSaved((c) => c.map((x) => (x.id === np.id ? np : x)))} onHide={(id) => setSaved((c) => c.filter((x) => x.id !== id))} />)}</>)}

        {section === 'communities' && (<><PageHeader title={t('my.communities')} />
          {mine.length === 0 ? <EmptyState title={t('home.empty')} /> : mine.map((c) => <Link key={c.id} href={`/communities/${c.slug}`} className="card block p-4 font-semibold hover:bg-brand-50">{locale === 'sw' ? c.nameSw : c.name}</Link>)}</>)}

        {section === 'blocked' && (<><PageHeader title={t('my.blocked')} />
          {blocked.length === 0 ? <EmptyState title={t('my.noBlocked')} /> : blocked.map((b) => (
            <div key={b.targetId} className="card flex items-center justify-between p-4"><span><span className="font-semibold">{b.pseudonym}</span> <span className="text-xs text-ink/50">· {b.kind}</span></span>
              <Button variant="secondary" className="px-3 py-1.5" onClick={async () => { await api(`/users/me/blocks/${b.targetId}`, { method: 'DELETE' }); setBlocked((c) => c.filter((x) => x.targetId !== b.targetId)); }}>{t('my.unblock')}</Button></div>
          ))}</>)}

        {section === 'language' && (<><PageHeader title={t('my.language')} /><LanguageToggle /></>)}

        {section === 'profile' && (<><PageHeader title={t('my.editName')} />
          <Field label={t('onb.username')}><input className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} /></Field>
          <Button onClick={saveName}>{t('common.save')}</Button></>)}

        {section === 'privacy' && (<><PageHeader title={t('my.privacy')} sub="Your email is private and never shown. Posts are anonymous unless you choose otherwise." />
          <label className="card flex cursor-pointer items-start gap-3 p-5"><input type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={user.showOnline !== false} onChange={(e) => setShowOnline(e.target.checked)} /><span><span className="block text-sm font-semibold">{t('presence.show')}</span><span className="block text-xs text-ink/60">{t('presence.showSub')}</span></span></label>
          <div className="card space-y-3 p-5"><p className="text-sm text-ink/70">Download everything we hold about you as a JSON file.</p><Button variant="secondary" onClick={exportData}>{t('my.export')}</Button></div>
          <div className="card space-y-3 p-5"><p className="text-sm text-ink/70">{t('my.deleteConfirm')}</p>
            <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" aria-label="Type DELETE" />
            <Button variant="danger" disabled={confirm !== 'DELETE'} onClick={deleteAccount}>{t('my.delete')}</Button></div></>)}
      </div>
    );
  }

  const rows = [
    { icon: Bookmark, label: t('my.saved'), on: () => setSection('saved') },
    { icon: Users, label: t('my.communities'), on: () => setSection('communities') },
    { icon: Bell, label: t('nav.notifications'), href: '/notifications' },
    { icon: EyeOff, label: t('my.privacy'), on: () => setSection('privacy') },
    { icon: VolumeX, label: t('my.blocked'), on: () => setSection('blocked') },
    { icon: Languages, label: t('my.language'), on: () => setSection('language'), value: locale === 'sw' ? 'Kiswahili' : 'English' },
    { icon: LifeBuoy, label: t('my.help'), href: '/help' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t('my.title')} sub={t('my.sub')} />
      <div className="card flex items-center gap-4 p-5">
        <Avatar name={user.pseudonym} size="lg" />
        <div className="flex-1"><p className="text-lg font-bold">{user.pseudonym}</p><p className="text-xs text-ink/55">{user.role === 'member' ? 'Member' : user.role}</p></div>
        <Button variant="secondary" className="px-4 py-2" onClick={() => setSection('profile')}>{t('my.editName')}</Button>
      </div>
      <ul className="card divide-y divide-brand-100 overflow-hidden">
        {rows.map(({ icon: Icon, label, on, href, value }) => {
          const inner = (<><Icon className="h-5 w-5 text-brand-600" aria-hidden /><span className="flex-1 text-sm font-medium">{label}</span>{value && <span className="text-xs text-ink/50">{value}</span>}<ChevronRight className="h-4 w-4 text-ink/40" aria-hidden /></>);
          return <li key={label}>{href ? <Link href={href} className="flex items-center gap-4 px-5 py-4 hover:bg-brand-50">{inner}</Link> : <button onClick={on} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-brand-50">{inner}</button>}</li>;
        })}
        <li><button onClick={() => { signOut(); router.replace('/'); }} className="flex w-full items-center gap-4 px-5 py-4 text-left text-sm font-medium text-red-600 hover:bg-red-50"><LogOut className="h-5 w-5" aria-hidden />{t('common.logout')}</button></li>
      </ul>
    </div>
  );
}
