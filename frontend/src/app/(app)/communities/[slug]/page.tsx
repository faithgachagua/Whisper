'use client';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { Button, ButtonLink, EmptyState, Notice, PageHeader, Spinner } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Community, Post } from '@/lib/types';

export default function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, locale } = useI18n();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([api<{ community: Community }>(`/communities/${slug}`), api<{ items: Post[] }>(`/posts?feed=latest&community=${slug}`)]);
      setCommunity(c.community); setPosts(p.items);
    } catch (e) { setError(errMsg(e)); }
  }, [slug]);
  useEffect(() => { void load(); }, [load]);

  async function toggle() {
    if (!community) return;
    const r = await api<{ community: Community }>(`/communities/${community.id}/${community.joined ? 'leave' : 'join'}`, { method: 'POST' });
    setCommunity(r.community);
  }

  if (error) return <Notice>{error}</Notice>;
  if (!community || !posts) return <Spinner label={t('common.loading')} />;

  return (
    <div>
      <PageHeader title={locale === 'sw' ? community.nameSw : community.name} sub={locale === 'sw' ? community.descriptionSw : community.description}
        action={<Button variant={community.joined ? 'secondary' : 'primary'} className="px-4 py-2" onClick={toggle}>{community.joined ? t('common.joined') : t('common.join')}</Button>} />
      <div className="space-y-4">
        {posts.map((p) => <PostCard key={p.id} post={p} onChange={(np) => setPosts((cur) => cur!.map((x) => (x.id === np.id ? np : x)))} onHide={(id) => setPosts((cur) => cur!.filter((x) => x.id !== id))} />)}
      </div>
      {posts.length === 0 && <EmptyState title={t('home.empty')} action={<ButtonLink href="/share">{t('nav.share')}</ButtonLink>} />}
    </div>
  );
}
