'use client';
import Link from 'next/link';
import { Bookmark, Ban, Flag, Heart, HandHeart, Ear, MessageCircle, MoreHorizontal, Trash2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { api, errMsg } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Post, ReactionType } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { ReportDialog } from './ReportDialog';
import { Avatar } from './ui';

const REACTIONS: Array<{ type: ReactionType; icon: typeof Heart }> = [
  { type: 'listening', icon: Ear }, { type: 'not_alone', icon: Heart }, { type: 'sending_support', icon: HandHeart },
];

export function PostCard({ post, onChange, onHide, linkToPost = true }: { post: Post; onChange: (p: Post) => void; onHide?: (id: string) => void; linkToPost?: boolean }) {
  const { t, locale } = useI18n();
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [error, setError] = useState('');

  async function react(type: ReactionType) {
    try { onChange((await api<{ post: Post }>(`/posts/${post.id}/reactions`, { body: { type } })).post); }
    catch (e) { setError(errMsg(e)); }
  }
  async function toggleSave() {
    try { onChange((await api<{ post: Post }>(`/posts/${post.id}/save`, { method: post.saved ? 'DELETE' : 'POST' })).post ?? post); }
    catch (e) { setError(errMsg(e)); }
  }
  async function hideAuthor(kind: 'mute' | 'block') {
    setMenu(false);
    try { await api(`/posts/${post.id}/author/block`, { body: { kind } }); onHide?.(post.id); } catch (e) { setError(errMsg(e)); }
  }
  async function remove() {
    setMenu(false);
    try { await api(`/posts/${post.id}`, { method: 'DELETE' }); onHide?.(post.id); } catch (e) { setError(errMsg(e)); }
  }

  const communityName = post.community ? (locale === 'sw' ? post.community.nameSw : post.community.name) : '';

  return (
    <article className="card p-5 transition-shadow hover:shadow-lg">
      <header className="flex items-start gap-3">
        <Avatar name={post.author.pseudonym} online={post.author.online} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{post.author.pseudonym}{post.author.isMe && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">You</span>}</p>
          <p className="text-xs text-ink/55">{timeAgo(post.createdAt, locale)}{communityName && <> · <Link href={`/communities/${post.community!.slug}`} className="hover:underline">{communityName}</Link></>}</p>
        </div>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} aria-label="More options" aria-expanded={menu} className="rounded-lg p-1.5 text-ink/60 hover:bg-brand-50"><MoreHorizontal className="h-5 w-5" /></button>
          {menu && (
            <div className="absolute right-0 z-10 mt-1 w-48 rounded-xl bg-white p-1 text-sm shadow-card ring-1 ring-brand-100" role="menu">
              {post.mine ? (
                <MenuItem icon={Trash2} onClick={remove}>{t('common.delete')}</MenuItem>
              ) : (
                <>
                  <MenuItem icon={Flag} onClick={() => { setMenu(false); setReport(true); }}>{t('common.report')}</MenuItem>
                  <MenuItem icon={VolumeX} onClick={() => hideAuthor('mute')}>{t('common.mute')}</MenuItem>
                  <MenuItem icon={Ban} onClick={() => hideAuthor('block')}>{t('common.block')}</MenuItem>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {linkToPost ? (
        <Link href={`/posts/${post.id}`} className="mt-3 block whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{post.body}</Link>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{post.body}</p>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2">
        {REACTIONS.map(({ type, icon: Icon }) => (
          <button key={type} onClick={() => react(type)} aria-pressed={post.myReaction === type}
            className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors',
              post.myReaction === type ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-brand-700 ring-brand-200 hover:bg-brand-50')}>
            <Icon className="h-4 w-4" aria-hidden />{t(`react.${type}` as const)}{post.reactions[type] > 0 && <span className="opacity-80">{post.reactions[type]}</span>}
          </button>
        ))}
        <span className="flex-1" />
        <Link href={`/posts/${post.id}`} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
          <MessageCircle className="h-4 w-4" aria-hidden />{post.commentCount > 0 ? post.commentCount : t('post.reply')}
        </Link>
        <button onClick={toggleSave} aria-pressed={post.saved} aria-label={post.saved ? t('post.saved') : t('post.save')}
          className={cn('rounded-full p-2 hover:bg-brand-50', post.saved ? 'text-brand-600' : 'text-ink/50')}>
          <Bookmark className={cn('h-4 w-4', post.saved && 'fill-current')} />
        </button>
      </footer>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
      {report && <ReportDialog targetType="post" targetId={post.id} onClose={() => setReport(false)} />}
    </article>
  );
}

function MenuItem({ icon: Icon, onClick, children }: { icon: typeof Flag; onClick: () => void; children: React.ReactNode }) {
  return <button role="menuitem" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-brand-50"><Icon className="h-4 w-4" aria-hidden />{children}</button>;
}
