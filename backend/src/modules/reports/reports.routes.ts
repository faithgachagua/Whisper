import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../core/db';
import { badRequest, notFound } from '../../core/errors';
import { asyncHandler, authenticate, validate } from '../../core/middleware';
import { fileReport } from './reports.service';

const schema = z.object({
  targetType: z.enum(['post', 'comment', 'user', 'conversation']),
  targetId: z.string().min(1),
  reason: z.enum(['harassment', 'hate', 'self_harm', 'sexual_content', 'spam', 'grooming', 'other']),
  details: z.string().max(1000).optional(),
});

export const reportsRouter = Router();
reportsRouter.use(authenticate);

reportsRouter.post('/', validate(schema), asyncHandler((req, res) => {
  const b = req.body as z.infer<typeof schema>;
  const me = req.user!.id;
  if (b.targetType === 'post' && !db.data.posts.some((p) => p.id === b.targetId)) throw notFound('Post not found.');
  if (b.targetType === 'comment' && !db.data.comments.some((c) => c.id === b.targetId)) throw notFound('Comment not found.');
  if (b.targetType === 'user') {
    if (b.targetId === me) throw badRequest('You cannot report yourself.');
    if (!db.data.users.some((u) => u.id === b.targetId)) throw notFound('User not found.');
  }
  if (b.targetType === 'conversation') {
    const c = db.data.conversations.find((x) => x.id === b.targetId);
    if (!c || (c.memberId !== me && c.listenerId !== me)) throw notFound('Conversation not found.');
  }
  fileReport({ reporterId: me, ...b });
  // Always the same response, whether or not it was a duplicate.
  res.status(201).json({ ok: true, message: 'Thank you. Our moderators will review this.' });
}));
