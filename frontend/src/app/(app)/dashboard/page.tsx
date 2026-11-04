'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { ButtonLink, EmptyState, PageHeader, Spinner, StatCard } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { Community, Post } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [sum, setSum] = useState<{ posts: number; saved: number; communities: number; unreadNotifications: number } | null>(null);
  const [mine, setMine] = useState<Post[]>([]);
  const [recs, setRecs] = useState<Community[]>([]);

  useEffect(() => {
    api<typeof sum>('/users/me/summary').then(setSum).catch(() => undefined);
    api<{ items: Post[] }>('/posts/mine').then((r) => setMine(r.items.slice(0, 3))).catch(() => undefined);
    api<{ items: Community[] }>('/communities').then((r) => setRecs(r.items.filter((c) => !c.joined).slice(0, 3))).catch(() => undefined);
  }, []);

  if (!user || !sum) return <Spinner label={t('common.loading')} />;
  const youth = user.ageTier !== 'adult';

  return (
    <div className="space-y-6">
      <PageHeader title={youth ? t('dash.youth') : t('dash.member')} sub={youth ? t('dash.youthSub') : undefined} />
      {youth && (
        <div className="card flex items-center gap-4 bg-brand-50 p-5"><HeartHandshake className="h-8 w-8 text-brand-600" aria-hidden />
          <div><p className="font-bold text-brand-900">{t('dash.wellbeing')}</p><p className="text-sm text-ink/70">{t('dash.wellbeingSub')}</p></div></div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t('dash.posts')} value={sum.posts} /><StatCard label={t('dash.saved')} value={sum.saved} />
        <StatCard label={t('dash.communities')} value={sum.communities} /><StatCard label={t('dash.notifications')} value={sum.unreadNotifications} />
      </div>
      <section className="space-y-3"><h2 className="font-bold text-brand-900">{t('dash.quick')}</h2>
        <div className="flex flex-wrap gap-3"><ButtonLink href="/share">{t('nav.share')}</ButtonLink><ButtonLink href="/talk" variant="secondary">{t('nav.talk')}</ButtonLink></div></section>
      {recs.length > 0 && (
        <section className="space-y-2"><h2 className="font-bold text-brand-900">{t('dash.recommended')}</h2>
          {recs.map((c) => <Link key={c.id} href={`/communities/${c.slug}`} className="card block p-4 font-semibold hover:bg-brand-50">{locale === 'sw' ? c.nameSw : c.name}</Link>)}</section>
      )}
      <section className="space-y-3"><h2 className="font-bold text-brand-900">{t('dash.recent')}</h2>
        {mine.length === 0 ? <EmptyState title={t('home.empty')} /> : mine.map((p) => <PostCard key={p.id} post={p} onChange={(np) => setMine((c) => c.map((x) => (x.id === np.id ? np : x)))} onHide={(id) => setMine((c) => c.filter((x) => x.id !== id))} />)}</section>
    </div>
  );
}
