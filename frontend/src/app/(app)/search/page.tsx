'use client';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { EmptyState, Notice, PageHeader, Spinner } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Community, Post } from '@/lib/types';

export default function SearchPage() {
  const { t, locale } = useI18n();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ posts: Post[]; communities: Community[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    setBusy(true);
    const id = setTimeout(async () => {
      try { setRes(await api(`/search?q=${encodeURIComponent(q.trim())}`)); setError(''); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
    }, 350);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="space-y-5">
      <PageHeader title={t('nav.search')} />
      <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden />
        <input autoFocus type="search" className="input pl-11" placeholder={t('search.placeholder')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('nav.search')} /></div>
      {error && <Notice>{error}</Notice>}
      {busy && <Spinner label={t('common.loading')} />}
      {res && !busy && res.posts.length === 0 && res.communities.length === 0 && <EmptyState title={t('search.none')} />}
      {res && res.communities.length > 0 && (
        <section className="space-y-2"><h2 className="text-sm font-bold text-brand-900">{t('search.communities')}</h2>
          {res.communities.map((c) => <Link key={c.id} href={`/communities/${c.slug}`} className="card block p-4 font-semibold hover:bg-brand-50">{locale === 'sw' ? c.nameSw : c.name}</Link>)}</section>
      )}
      {res && res.posts.length > 0 && (
        <section className="space-y-3"><h2 className="text-sm font-bold text-brand-900">{t('search.posts')}</h2>
          {res.posts.map((p) => <PostCard key={p.id} post={p} onChange={(np) => setRes((r) => r && { ...r, posts: r.posts.map((x) => (x.id === np.id ? np : x)) })} onHide={(id) => setRes((r) => r && { ...r, posts: r.posts.filter((x) => x.id !== id) })} />)}</section>
      )}
    </div>
  );
}
