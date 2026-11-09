import { db } from '../../core/db';
import { isOnline, isStaff } from '../../core/presence';
import { attachedImages } from '../uploads/uploads.service';
import { findCommunity, findUser, hiddenAuthorIds, isProtected } from '../../core/serializers';
import type { Comment, Post, ReactionType, User } from '../../core/types';

export function postView(p: Post, viewer: User) {
  const author = findUser(p.authorId);
  const community = findCommunity(p.communityId);
  const reactions: Record<ReactionType, number> = { listening: 0, not_alone: 0, sending_support: 0 };
  let mine: ReactionType | null = null;
  for (const r of db.data.reactions) {
    if (r.postId !== p.id) continue;
    reactions[r.type]++;
    if (r.userId === viewer.id) mine = r.type;
  }
  return {
    id: p.id,
    community: community ? { id: community.id, slug: community.slug, name: community.name, nameSw: community.nameSw } : null,
    // Anonymous posts never expose the author's account or pseudonym.
    author: { pseudonym: p.anonymous ? 'Anonymous member' : author?.pseudonym ?? 'Former member', isMe: p.authorId === viewer.id, online: !p.anonymous && isStaff(viewer) && !!author && isOnline(author) },
    body: p.body,
    images: attachedImages(p.imageIds),
    createdAt: p.createdAt,
    reactions,
    reactionTotal: reactions.listening + reactions.not_alone + reactions.sending_support,
    myReaction: mine,
    commentCount: db.data.comments.filter((c) => c.postId === p.id && c.status === 'visible').length,
    saved: db.data.saves.some((s) => s.postId === p.id && s.userId === viewer.id),
    mine: p.authorId === viewer.id,
  };
}

export function commentView(c: Comment, viewer: User) {
  const author = findUser(c.authorId);
  return {
    id: c.id, postId: c.postId, parentId: c.parentId, body: c.body, createdAt: c.createdAt,
    author: { pseudonym: c.anonymous ? 'Anonymous member' : author?.pseudonym ?? 'Former member', isMe: c.authorId === viewer.id, online: !c.anonymous && isStaff(viewer) && !!author && isOnline(author) },
  };
}

/** Posts this viewer may see (not removed, not from blocked/muted authors, community allowed for their age tier). */
export function visiblePostsFor(viewer: User): Post[] {
  const hidden = hiddenAuthorIds(viewer.id);
  const allowed = new Set(db.data.communities.filter((c) => !isProtected(viewer) || c.youthSafe).map((c) => c.id));
  return db.data.posts.filter((p) => p.status === 'visible' && allowed.has(p.communityId) && (p.authorId === viewer.id || !hidden.has(p.authorId)));
}

export type FeedKind = 'for-you' | 'latest' | 'following';

export function buildFeed(viewer: User, opts: { feed: FeedKind; communitySlug?: string; page: number; limit: number }) {
  let posts = visiblePostsFor(viewer);
  const joined = new Set(db.data.memberships.filter((m) => m.userId === viewer.id).map((m) => m.communityId));

  if (opts.communitySlug) {
    const c = db.data.communities.find((x) => x.slug === opts.communitySlug);
    posts = c ? posts.filter((p) => p.communityId === c.id) : [];
  } else if (opts.feed === 'following') {
    posts = posts.filter((p) => joined.has(p.communityId));
  }

  const byTime = (a: Post, b: Post) => b.createdAt.localeCompare(a.createdAt);
  if (opts.feed === 'for-you' && !opts.communitySlug) {
    const interestMatch = new Set(viewer.interests);
    const score = (p: Post) => {
      const hours = (Date.now() - new Date(p.createdAt).getTime()) / 3_600_000;
      const engagement = db.data.reactions.filter((r) => r.postId === p.id).length + 2 * db.data.comments.filter((c) => c.postId === p.id).length + 1;
      const c = findCommunity(p.communityId);
      const boost = (joined.has(p.communityId) ? 1.5 : 1) * (c && interestMatch.has(c.slug) ? 1.3 : 1);
      return (engagement * boost) / Math.pow(hours + 2, 1.2);
    };
    posts = posts.sort((a, b) => score(b) - score(a));
  } else {
    posts = posts.sort(byTime);
  }

  const start = (opts.page - 1) * opts.limit;
  const slice = posts.slice(start, start + opts.limit);
  return { items: slice.map((p) => postView(p, viewer)), page: opts.page, hasMore: start + opts.limit < posts.length };
}
