import { Router } from 'express';
import { z } from 'zod';
import { db, newId, now } from '../../core/db';
import { badRequest, forbidden, notFound } from '../../core/errors';
import { asyncHandler, assertCanPublish, authenticate, validate } from '../../core/middleware';
import { hasCrisisLanguage, hasLink, hasPersonalInfo, safetyPayload } from '../../core/safety';
import { communityAllowedFor, findCommunity, notify } from '../../core/serializers';
import type { Post } from '../../core/types';
import { flagForReview } from '../reports/reports.service';
import { markAttached, validateImages } from '../uploads/uploads.service';
import { buildFeed, commentView, postView, visiblePostsFor } from './posts.service';

const feedQuery = z.object({
  feed: z.enum(['for-you', 'latest', 'following']).default('for-you'),
  community: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(15),
});

const createPostSchema = z.object({
  communityId: z.string().min(1, 'Choose a community.'),
  body: z.string().trim().min(3, 'Write a little more before sharing.').max(2000, 'Keep it under 2,000 characters.'),
  anonymous: z.boolean().default(true),
  imageIds: z.array(z.string()).max(4, 'You can add up to 4 photos.').default([]),
});

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write a reply first.').max(1000, 'Keep it under 1,000 characters.'),
  parentId: z.string().nullable().optional(),
  anonymous: z.boolean().default(true),
});

const reactionSchema = z.object({ type: z.enum(['listening', 'not_alone', 'sending_support']) });

export const postsRouter = Router();
postsRouter.use(authenticate);

postsRouter.get('/', validate(feedQuery, 'query'), (req, res) => {
  const q = req.query as unknown as z.infer<typeof feedQuery>;
  res.json(buildFeed(req.user!, { feed: q.feed, communitySlug: q.community, page: q.page, limit: q.limit }));
});

postsRouter.get('/saved', (req, res) => {
  const ids = db.data.saves.filter((s) => s.userId === req.user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((s) => s.postId);
  const visible = new Map(visiblePostsFor(req.user!).map((p) => [p.id, p]));
  res.json({ items: ids.map((id) => visible.get(id)).filter((p): p is Post => !!p).map((p) => postView(p, req.user!)) });
});

postsRouter.get('/mine', (req, res) => {
  const items = db.data.posts.filter((p) => p.authorId === req.user!.id && p.status === 'visible').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ items: items.map((p) => postView(p, req.user!)) });
});

postsRouter.post('/', validate(createPostSchema), asyncHandler((req, res) => {
  const user = req.user!;
  assertCanPublish(user);
  const b = req.body as z.infer<typeof createPostSchema>;
  const community = findCommunity(b.communityId);
  if (!community) throw notFound('Community not found.');
  if (!communityAllowedFor(user, community)) throw forbidden('You cannot post in this community.');
  if (hasPersonalInfo(b.body)) {
    throw badRequest('Please remove phone numbers, emails or social handles to keep everyone anonymous and safe.', 'CONTAINS_PERSONAL_INFO');
  }
  if (community.strictIdentity && hasLink(b.body)) {
    throw badRequest('Links aren’t allowed in this community. Share your story without pointing to anyone online.', 'LINKS_NOT_ALLOWED');
  }
  if (b.imageIds.length > 0 && community.noImages) throw badRequest('Photos aren’t allowed in this community.', 'IMAGES_NOT_ALLOWED');
  const imgs = validateImages(user.id, b.imageIds, 'post');
  const crisis = hasCrisisLanguage(b.body);
  const post: Post = { id: newId(), authorId: user.id, communityId: community.id, body: b.body, anonymous: b.anonymous, imageIds: imgs.map((i) => i.id), status: 'visible', crisisFlag: crisis, createdAt: now() };
  markAttached(imgs);
  db.data.posts.push(post);
  // Posting in a community implies following it.
  if (!db.data.memberships.some((m) => m.userId === user.id && m.communityId === community.id)) {
    db.data.memberships.push({ userId: user.id, communityId: community.id, joinedAt: now() });
  }
  if (crisis) flagForReview('post', post.id, 'crisis_language', 'Automatic: possible crisis language. Consider sending support resources.');
  db.save();
  res.status(201).json({ post: postView(post, user), safety: crisis ? safetyPayload(user.ageTier) : null });
}));

postsRouter.get('/:id', (req, res) => {
  const post = visiblePostsFor(req.user!).find((p) => p.id === req.params.id);
  if (!post) throw notFound('This post is not available.');
  res.json({ post: postView(post, req.user!) });
});

postsRouter.delete('/:id', asyncHandler((req, res) => {
  const post = db.data.posts.find((p) => p.id === req.params.id);
  if (!post || post.authorId !== req.user!.id) throw notFound('Post not found.');
  post.status = 'removed';
  db.save();
  res.json({ ok: true });
}));

postsRouter.post('/:id/reactions', validate(reactionSchema), asyncHandler((req, res) => {
  const user = req.user!;
  const post = visiblePostsFor(user).find((p) => p.id === req.params.id);
  if (!post) throw notFound('This post is not available.');
  const { type } = req.body as z.infer<typeof reactionSchema>;
  const existing = db.data.reactions.find((r) => r.postId === post.id && r.userId === user.id);
  if (existing && existing.type === type) {
    db.data.reactions = db.data.reactions.filter((r) => r !== existing); // tap again to remove
  } else if (existing) {
    existing.type = type;
  } else {
    db.data.reactions.push({ postId: post.id, userId: user.id, type });
    if (post.authorId !== user.id) notify(post.authorId, { type: 'reaction', title: 'Someone is with you', body: 'A community member reacted to your post.', link: `/posts/${post.id}` });
  }
  db.save();
  res.json({ post: postView(post, user) });
}));

postsRouter.post('/:id/save', asyncHandler((req, res) => {
  const post = visiblePostsFor(req.user!).find((p) => p.id === req.params.id);
  if (!post) throw notFound('This post is not available.');
  if (!db.data.saves.some((s) => s.postId === post.id && s.userId === req.user!.id)) {
    db.data.saves.push({ postId: post.id, userId: req.user!.id, createdAt: now() });
    db.save();
  }
  res.json({ post: postView(post, req.user!) });
}));

postsRouter.delete('/:id/save', asyncHandler((req, res) => {
  db.data.saves = db.data.saves.filter((s) => !(s.postId === req.params.id && s.userId === req.user!.id));
  db.save();
  const post = db.data.posts.find((p) => p.id === req.params.id);
  res.json({ post: post ? postView(post, req.user!) : null });
}));

/** Block or mute a post's author without revealing who they are. */
const authorBlockSchema = z.object({ kind: z.enum(['block', 'mute']).default('mute') });
postsRouter.post('/:id/author/block', validate(authorBlockSchema), asyncHandler((req, res) => {
  const post = db.data.posts.find((p) => p.id === req.params.id);
  if (!post) throw notFound('Post not found.');
  if (post.authorId === req.user!.id) throw badRequest('This is your own post.');
  db.data.blocks = db.data.blocks.filter((b) => !(b.userId === req.user!.id && b.targetId === post.authorId));
  db.data.blocks.push({ userId: req.user!.id, targetId: post.authorId, kind: (req.body as z.infer<typeof authorBlockSchema>).kind, createdAt: now() });
  db.save();
  res.json({ ok: true });
}));

// ---- comments & replies ----
postsRouter.get('/:id/comments', (req, res) => {
  const post = visiblePostsFor(req.user!).find((p) => p.id === req.params.id);
  if (!post) throw notFound('This post is not available.');
  const hidden = new Set(db.data.blocks.filter((b) => b.userId === req.user!.id).map((b) => b.targetId));
  const items = db.data.comments
    .filter((c) => c.postId === post.id && c.status === 'visible' && !hidden.has(c.authorId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((c) => commentView(c, req.user!));
  res.json({ items });
});

postsRouter.post('/:id/comments', validate(commentSchema), asyncHandler((req, res) => {
  const user = req.user!;
  assertCanPublish(user);
  const post = visiblePostsFor(user).find((p) => p.id === req.params.id);
  if (!post) throw notFound('This post is not available.');
  const b = req.body as z.infer<typeof commentSchema>;
  if (hasPersonalInfo(b.body)) throw badRequest('Please remove phone numbers, emails or social handles.', 'CONTAINS_PERSONAL_INFO');
  if (b.parentId && !db.data.comments.some((c) => c.id === b.parentId && c.postId === post.id)) throw badRequest('The comment you are replying to no longer exists.');
  const comment = { id: newId(), postId: post.id, authorId: user.id, parentId: b.parentId ?? null, body: b.body, anonymous: b.anonymous, status: 'visible' as const, createdAt: now() };
  db.data.comments.push(comment);
  if (post.authorId !== user.id) notify(post.authorId, { type: 'reply', title: 'New reply on your post', body: b.body.slice(0, 80), link: `/posts/${post.id}` });
  const crisis = hasCrisisLanguage(b.body);
  if (crisis) flagForReview('comment', comment.id, 'crisis_language', 'Automatic: possible crisis language in a comment.');
  db.save();
  res.status(201).json({ comment: commentView(comment, user), safety: crisis ? safetyPayload(user.ageTier) : null });
}));

postsRouter.delete('/:postId/comments/:id', asyncHandler((req, res) => {
  const c = db.data.comments.find((x) => x.id === req.params.id && x.postId === req.params.postId);
  if (!c || c.authorId !== req.user!.id) throw notFound('Comment not found.');
  c.status = 'removed';
  db.save();
  res.json({ ok: true });
}));
