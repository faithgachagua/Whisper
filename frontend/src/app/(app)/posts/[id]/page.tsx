'use client';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { SafetyCard } from '@/components/SafetyCard';
import { Avatar, Button, Notice, Spinner } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Comment, Post, SafetyPayload } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [safety, setSafety] = useState<SafetyPayload | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([api<{ post: Post }>(`/posts/${id}`), api<{ items: Comment[] }>(`/posts/${id}/comments`)]);
      setPost(p.post); setComments(c.items);
    } catch (e) { setError(errMsg(e)); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api<{ comment: Comment; safety: SafetyPayload | null }>(`/posts/${id}/comments`, { body: { body: text, anonymous: true } });
      setComments((c) => [...c, r.comment]); setText(''); setSafety(r.safety);
      setPost((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }

  if (error && !post) return <Notice>{error}</Notice>;
  if (!post) return <Spinner label={t('common.loading')} />;

  return (
    <div className="space-y-5">
      <PostCard post={post} linkToPost={false} onChange={setPost} onHide={() => history.back()} />
      <section aria-label={t('post.comments')} className="space-y-3">
        <h2 className="text-sm font-bold text-brand-900">{t('post.comments')}</h2>
        {comments.length === 0 && <p className="text-sm text-ink/60">{t('post.noReplies')}</p>}
        {comments.map((c) => (
          <div key={c.id} className="card flex gap-3 p-4">
            <Avatar name={c.author.pseudonym} size="sm" online={c.author.online} />
            <div className="min-w-0">
              <p className="text-xs text-ink/55"><span className="font-bold text-ink">{c.author.pseudonym}</span> · {timeAgo(c.createdAt, locale)}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
            </div>
          </div>
        ))}
      </section>
      {safety && <SafetyCard safety={safety} />}
      <form onSubmit={reply} className="space-y-3">
        {error && <Notice>{error}</Notice>}
        <textarea className="input min-h-24" placeholder={t('post.writeReply')} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} aria-label={t('post.writeReply')} />
        <Button type="submit" loading={busy} disabled={!text.trim()}>{t('post.reply')}</Button>
      </form>
    </div>
  );
}
