'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { Button, ButtonLink, EmptyState, Notice, Spinner } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';

type Feed = 'for-you' | 'latest' | 'following';
const TABS: Array<{ id: Feed; key: 'home.forYou' | 'home.latest' | 'home.following' }> = [
  { id: 'for-you', key: 'home.forYou' }, { id: 'latest', key: 'home.latest' }, { id: 'following', key: 'home.following' },
];

export default function HomePage() {
  const { t } = useI18n();
  const [feed, setFeed] = useState<Feed>('for-you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (f: Feed, p: number) => {
    setLoading(true); setError('');
    try {
      const r = await api<{ items: Post[]; hasMore: boolean }>(`/posts?feed=${f}&page=${p}`);
      setPosts((cur) => (p === 1 ? r.items : [...cur, ...r.items]));
      setMore(r.hasMore); setPage(p);
    } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(feed, 1); }, [feed, load]);

  return (
    <div>
      <div role="tablist" className="mb-5 flex gap-6 border-b border-brand-100">
        {TABS.map((tab) => (
          <button key={tab.id} role="tab" aria-selected={feed === tab.id} onClick={() => setFeed(tab.id)}
            className={cn('-mb-px border-b-2 pb-3 text-sm font-semibold', feed === tab.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink/50 hover:text-ink')}>
            {t(tab.key)}
          </button>
        ))}
      </div>

      {error && <Notice>{error} <button className="font-semibold underline" onClick={() => load(feed, 1)}>{t('common.retry')}</button></Notice>}
      <div className="space-y-4">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onChange={(np) => setPosts((cur) => cur.map((x) => (x.id === np.id ? np : x)))} onHide={(id) => setPosts((cur) => cur.filter((x) => x.id !== id))} />
        ))}
      </div>
      {loading && <Spinner label={t('common.loading')} />}
      {!loading && !error && posts.length === 0 && (
        <EmptyState title={t('home.empty')} action={<div className="flex gap-3"><ButtonLink href="/communities" variant="secondary">{t('nav.communities')}</ButtonLink><ButtonLink href="/share">{t('nav.share')}</ButtonLink></div>} />
      )}
      {more && !loading && <div className="mt-5 text-center"><Button variant="secondary" onClick={() => load(feed, page + 1)}>{t('common.loadMore')}</Button></div>}

      <Link href="/share" aria-label={t('nav.share')} className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 lg:bottom-8 lg:right-8">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
