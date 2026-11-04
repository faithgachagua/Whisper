import { Router } from 'express';
import { z } from 'zod';
import { db, newId, now } from '../../core/db';
import { badRequest, conflict, forbidden, notFound } from '../../core/errors';
import { asyncHandler, authenticate, validate } from '../../core/middleware';
import { audit, selfView, tierFromBand } from '../../core/serializers';
import { MIN_PARTICIPATION_AGE } from '../../config/safety';

const pseudonym = z.string().trim().min(3, 'Use at least 3 characters.').max(24, 'Use at most 24 characters.').regex(/^[A-Za-z0-9_ .-]+$/, 'Use letters, numbers, spaces, dots, dashes or underscores.');

const onboardingSchema = z.object({
  ageBand: z.enum(['under_13', '13_17', '18_24', '25_34', '35_44', '45_plus', 'prefer_not_to_say']).optional(),
  gender: z.enum(['female', 'male', 'non_binary', 'other', 'prefer_not_to_say']).optional(),
  interests: z.array(z.string().max(60)).max(12).default([]),
  pseudonym: pseudonym.optional(),
  locale: z.enum(['en', 'sw']).optional(),
});

const profileSchema = z.object({
  pseudonym: pseudonym.optional(),
  gender: z.enum(['female', 'male', 'non_binary', 'other', 'prefer_not_to_say']).optional(),
  interests: z.array(z.string().max(60)).max(12).optional(),
  locale: z.enum(['en', 'sw']).optional(),
  showOnline: z.boolean().optional(),
});

function ensureUniquePseudonym(name: string, selfId: string) {
  if (db.data.users.some((u) => u.id !== selfId && u.pseudonym.toLowerCase() === name.toLowerCase())) throw conflict('That username is taken.', 'PSEUDONYM_TAKEN');
}

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get('/me', (req, res) => res.json({ user: selfView(req.user!) }));

usersRouter.patch('/me', validate(profileSchema), asyncHandler((req, res) => {
  const u = req.user!;
  const body = req.body as z.infer<typeof profileSchema>;
  if (body.pseudonym) { ensureUniquePseudonym(body.pseudonym, u.id); u.pseudonym = body.pseudonym; }
  if (body.gender) u.gender = body.gender;
  if (body.interests) u.interests = body.interests;
  if (body.locale) u.locale = body.locale;
  if (body.showOnline !== undefined) u.showOnline = body.showOnline;
  db.save();
  res.json({ user: selfView(u) });
}));

/**
 * Onboarding. Self-reported age band is used for demographics AND to choose safeguards,
 * but it is never treated as verified: "prefer not to say" gets the same protections as youth.
 * Age can only be set while the tier is still unknown — it cannot be edited later to unlock features.
 */
usersRouter.post('/me/onboarding', validate(onboardingSchema), asyncHandler((req, res) => {
  const u = req.user!;
  const body = req.body as z.infer<typeof onboardingSchema>;
  if (body.ageBand === 'under_13') {
    u.status = 'suspended';
    audit(u.id, 'account.underage_blocked', 'user', u.id);
    db.save();
    throw forbidden(`Whisper is for people aged ${MIN_PARTICIPATION_AGE} and over. If you need someone to talk to, call Childline Kenya on 116 (free).`, 'UNDERAGE_NOT_ELIGIBLE');
  }
  if (body.pseudonym) { ensureUniquePseudonym(body.pseudonym, u.id); u.pseudonym = body.pseudonym; }
  if (u.ageTier === 'unknown' && body.ageBand) { u.ageBand = body.ageBand; u.ageTier = tierFromBand(body.ageBand); }
  if (body.gender) u.gender = body.gender;
  u.interests = body.interests;
  if (body.locale) u.locale = body.locale;
  u.onboarded = true;
  db.save();
  res.json({ user: selfView(u) });
}));

usersRouter.get('/me/summary', (req, res) => {
  const u = req.user!;
  res.json({
    posts: db.data.posts.filter((p) => p.authorId === u.id && p.status === 'visible').length,
    saved: db.data.saves.filter((s) => s.userId === u.id).length,
    communities: db.data.memberships.filter((m) => m.userId === u.id).length,
    unreadNotifications: db.data.notifications.filter((n) => n.userId === u.id && !n.read).length,
  });
});

// ---- blocking & muting (posts expose an author-block route so anonymous authors stay hidden) ----
usersRouter.get('/me/blocks', (req, res) => {
  const items = db.data.blocks.filter((b) => b.userId === req.user!.id).map((b) => ({
    targetId: b.targetId, kind: b.kind, createdAt: b.createdAt, pseudonym: db.data.users.find((x) => x.id === b.targetId)?.pseudonym ?? 'Former member',
  }));
  res.json({ items });
});

usersRouter.delete('/me/blocks/:id', (req, res) => {
  db.data.blocks = db.data.blocks.filter((b) => !(b.userId === req.user!.id && b.targetId === req.params.id));
  db.save();
  res.json({ ok: true });
});

const blockSchema = z.object({ kind: z.enum(['block', 'mute']).default('block') });
usersRouter.post('/:id/block', validate(blockSchema), asyncHandler((req, res) => {
  const targetId = String(req.params.id);
  if (targetId === req.user!.id) throw badRequest('You cannot block yourself.');
  if (!db.data.users.some((x) => x.id === targetId)) throw notFound('User not found.');
  const kind = (req.body as z.infer<typeof blockSchema>).kind;
  db.data.blocks = db.data.blocks.filter((b) => !(b.userId === req.user!.id && b.targetId === targetId));
  db.data.blocks.push({ userId: req.user!.id, targetId, kind, createdAt: now() });
  db.save();
  res.status(201).json({ ok: true });
}));

// ---- privacy: export & delete ----
usersRouter.get('/me/export', (req, res) => {
  const u = req.user!;
  res.json({
    exportedAt: now(),
    account: selfView(u),
    posts: db.data.posts.filter((p) => p.authorId === u.id),
    comments: db.data.comments.filter((c) => c.authorId === u.id),
    saved: db.data.saves.filter((s) => s.userId === u.id),
    communities: db.data.memberships.filter((m) => m.userId === u.id),
  });
});

const deleteSchema = z.object({ confirm: z.literal('DELETE') });
usersRouter.post('/me/delete', validate(deleteSchema), asyncHandler((req, res) => {
  const u = req.user!;
  // Remove personal content and detach the account. Reports and audit entries are kept for safeguarding.
  db.data.posts.forEach((p) => { if (p.authorId === u.id) { p.status = 'removed'; p.body = ''; } });
  db.data.comments.forEach((c) => { if (c.authorId === u.id) { c.status = 'removed'; c.body = ''; } });
  db.data.saves = db.data.saves.filter((s) => s.userId !== u.id);
  db.data.memberships = db.data.memberships.filter((m) => m.userId !== u.id);
  db.data.notifications = db.data.notifications.filter((n) => n.userId !== u.id);
  u.status = 'deleted';
  u.email = `deleted+${newId()}@whisper.invalid`;
  u.pseudonym = `Former member ${u.id.slice(0, 6)}`;
  u.interests = [];
  u.gender = null;
  db.save();
  res.json({ ok: true });
}));
