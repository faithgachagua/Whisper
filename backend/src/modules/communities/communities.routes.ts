import { Router } from 'express';
import { db, now } from '../../core/db';
import { forbidden, notFound } from '../../core/errors';
import { asyncHandler, authenticate } from '../../core/middleware';
import { isOnline, isStaff } from '../../core/presence';
import { communityAllowedFor } from '../../core/serializers';
import type { Community, User } from '../../core/types';

export function communityView(c: Community, viewer: User) {
  return {
    ...c,
    memberCount: db.data.memberships.filter((m) => m.communityId === c.id).length,
    activeNow: !isStaff(viewer) ? 0 : db.data.memberships.filter((m) => m.communityId === c.id).filter((m) => { const u = db.data.users.find((x) => x.id === m.userId); return !!u && isOnline(u); }).length,
    joined: db.data.memberships.some((m) => m.communityId === c.id && m.userId === viewer.id),
    allowed: communityAllowedFor(viewer, c),
  };
}

export const communitiesRouter = Router();
communitiesRouter.use(authenticate);

communitiesRouter.get('/', (req, res) => {
  const items = db.data.communities.filter((c) => communityAllowedFor(req.user!, c)).map((c) => communityView(c, req.user!));
  res.json({ items });
});

communitiesRouter.get('/mine', (req, res) => {
  const ids = new Set(db.data.memberships.filter((m) => m.userId === req.user!.id).map((m) => m.communityId));
  res.json({ items: db.data.communities.filter((c) => ids.has(c.id)).map((c) => communityView(c, req.user!)) });
});

communitiesRouter.get('/:slug', (req, res) => {
  const c = db.data.communities.find((x) => x.slug === req.params.slug);
  if (!c || !communityAllowedFor(req.user!, c)) throw notFound('Community not found.');
  res.json({ community: communityView(c, req.user!) });
});

communitiesRouter.post('/:id/join', asyncHandler((req, res) => {
  const c = db.data.communities.find((x) => x.id === req.params.id);
  if (!c) throw notFound('Community not found.');
  if (!communityAllowedFor(req.user!, c)) throw forbidden('This community is not available for your account.');
  if (!db.data.memberships.some((m) => m.communityId === c.id && m.userId === req.user!.id)) {
    db.data.memberships.push({ userId: req.user!.id, communityId: c.id, joinedAt: now() });
    db.save();
  }
  res.json({ community: communityView(c, req.user!) });
}));

communitiesRouter.post('/:id/leave', asyncHandler((req, res) => {
  const c = db.data.communities.find((x) => x.id === req.params.id);
  if (!c) throw notFound('Community not found.');
  db.data.memberships = db.data.memberships.filter((m) => !(m.communityId === c.id && m.userId === req.user!.id));
  db.save();
  res.json({ community: communityView(c, req.user!) });
}));
