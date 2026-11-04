import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { db, newId, now } from '../../core/db';
import { badRequest, conflict, notFound } from '../../core/errors';
import { asyncHandler, authenticate, requireRole, validate } from '../../core/middleware';
import { isOnline } from '../../core/presence';
import { BAND_LABEL, audit } from '../../core/serializers';
import type { AgeBand } from '../../core/types';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

adminRouter.get('/stats', (_req, res) => {
  const live = db.data.users.filter((u) => u.status !== 'deleted');
  const today = now().slice(0, 10);
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);

  // Cumulative users for the last 6 months.
  const growth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - (5 - i) + 1, 1));
    return { month: MONTHS[(d.getUTCMonth() + 11) % 12], users: live.filter((u) => new Date(u.createdAt) < d).length };
  });

  // Aggregated demographics with small-group suppression so no individual can be singled out.
  const counts = new Map<AgeBand, number>();
  live.forEach((u) => { if (u.ageBand) counts.set(u.ageBand, (counts.get(u.ageBand) ?? 0) + 1); });
  const k = env.smallGroupThreshold;
  const shown = [...counts.entries()].filter(([, n]) => n >= k);
  const hiddenTotal = [...counts.entries()].filter(([, n]) => n < k).reduce((s, [, n]) => s + n, 0);
  const other = hiddenTotal >= k ? hiddenTotal : 0;
  const total = shown.reduce((s, [, n]) => s + n, 0) + other;
  const items = shown.map(([band, n]) => ({ band, label: BAND_LABEL[band], count: n, percent: total ? Math.round((n / total) * 100) : 0 }));
  if (other) items.push({ band: 'other' as AgeBand, label: 'Other (small groups combined)', count: other, percent: Math.round((other / total) * 100) });

  const postCounts = new Map<string, number>();
  db.data.posts.filter((p) => p.status === 'visible').forEach((p) => postCounts.set(p.communityId, (postCounts.get(p.communityId) ?? 0) + 1));
  const topCommunities = db.data.communities
    .map((c) => ({ id: c.id, name: c.name, posts: postCounts.get(c.id) ?? 0, members: db.data.memberships.filter((m) => m.communityId === c.id).length }))
    .sort((a, b) => b.posts - a.posts).slice(0, 5);

  res.json({
    totals: {
      users: live.length,
      newThisMonth: live.filter((u) => new Date(u.createdAt) >= monthStart).length,
      onlineNow: live.filter(isOnline).length,
      activeToday: live.filter((u) => u.lastSeenAt.slice(0, 10) === today).length,
      posts: db.data.posts.filter((p) => p.status === 'visible').length,
      openReports: db.data.reports.filter((r) => r.status === 'open').length,
    },
    userGrowth: growth,
    ageDemographics: { items, suppressed: counts.size > shown.length },
    topCommunities,
    safety: {
      moderationActionsThisMonth: db.data.auditLogs.filter((a) => a.action.startsWith('moderation.') && new Date(a.createdAt) >= monthStart).length,
      usersRestricted: db.data.users.filter((u) => u.status === 'restricted').length,
      urgentOpen: db.data.reports.filter((r) => r.status === 'open' && r.priority === 'urgent').length,
    },
  });
});

const usersQuery = z.object({ q: z.string().trim().optional(), role: z.enum(['member', 'listener', 'moderator', 'admin']).optional(), page: z.coerce.number().int().min(1).default(1) });

adminRouter.get('/users', validate(usersQuery, 'query'), (req, res) => {
  const q = req.query as unknown as z.infer<typeof usersQuery>;
  const needle = q.q?.toLowerCase();
  const list = db.data.users.filter((u) => u.status !== 'deleted' && (!q.role || u.role === q.role) && (!needle || u.pseudonym.toLowerCase().includes(needle) || u.email.includes(needle)));
  const start = (q.page - 1) * 25;
  res.json({
    items: list.slice(start, start + 25).map((u) => ({
      id: u.id, pseudonym: u.pseudonym, email: u.email, role: u.role, status: u.status, online: isOnline(u), ageTier: u.ageTier, strikes: u.strikes, listener: u.listener, createdAt: u.createdAt,
    })),
    total: list.length, page: q.page,
  });
});

const roleSchema = z.object({ role: z.enum(['member', 'listener', 'moderator', 'admin']) });
adminRouter.patch('/users/:id/role', validate(roleSchema), asyncHandler((req, res) => {
  const u = db.data.users.find((x) => x.id === req.params.id);
  if (!u) throw notFound('User not found.');
  const { role } = req.body as z.infer<typeof roleSchema>;
  if (u.id === req.user!.id && role !== 'admin') throw badRequest('You cannot remove your own admin access.');
  u.role = role;
  // Listeners start un-vetted: they cannot see requests until an admin marks them vetted.
  if (role === 'listener' && !u.listener) u.listener = { vetted: false, youthApproved: false, online: false, topics: [] };
  audit(req.user!.id, 'admin.role_changed', 'user', u.id, { role });
  db.save();
  res.json({ ok: true });
}));

const listenerSchema = z.object({ vetted: z.boolean().optional(), youthApproved: z.boolean().optional(), topics: z.array(z.string().max(40)).max(12).optional() });
adminRouter.patch('/users/:id/listener', validate(listenerSchema), asyncHandler((req, res) => {
  const u = db.data.users.find((x) => x.id === req.params.id);
  if (!u || u.role !== 'listener' || !u.listener) throw notFound('Listener not found.');
  const b = req.body as z.infer<typeof listenerSchema>;
  if (b.youthApproved && !(b.vetted ?? u.listener.vetted)) throw badRequest('A listener must be vetted before being approved for youth.');
  Object.assign(u.listener, Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)));
  if (u.listener.vetted === false) { u.listener.online = false; u.listener.youthApproved = false; }
  audit(req.user!.id, 'admin.listener_updated', 'user', u.id, b);
  db.save();
  res.json({ ok: true });
}));

const statusSchema = z.object({ status: z.enum(['active', 'suspended', 'banned']), note: z.string().max(300).optional() });
adminRouter.patch('/users/:id/status', validate(statusSchema), asyncHandler((req, res) => {
  const u = db.data.users.find((x) => x.id === req.params.id);
  if (!u) throw notFound('User not found.');
  if (u.id === req.user!.id) throw badRequest('You cannot change your own status.');
  const b = req.body as z.infer<typeof statusSchema>;
  u.status = b.status;
  u.restrictedUntil = undefined;
  audit(req.user!.id, 'admin.status_changed', 'user', u.id, { status: b.status, note: b.note });
  db.save();
  res.json({ ok: true });
}));

adminRouter.get('/audit-logs', (_req, res) => {
  const items = [...db.data.auditLogs].reverse().slice(0, 100).map((a) => ({
    ...a, actor: db.data.users.find((u) => u.id === a.actorId)?.pseudonym ?? 'unknown',
  }));
  res.json({ items });
});

const communitySchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/), name: z.string().trim().min(2).max(60), nameSw: z.string().trim().min(2).max(80),
  description: z.string().trim().max(200), descriptionSw: z.string().trim().max(200), youthSafe: z.boolean().default(false),
});
adminRouter.post('/communities', validate(communitySchema), asyncHandler((req, res) => {
  const b = req.body as z.infer<typeof communitySchema>;
  if (db.data.communities.some((c) => c.slug === b.slug)) throw conflict('That slug is already used.');
  const c = { id: newId(), ...b };
  db.data.communities.push(c);
  audit(req.user!.id, 'admin.community_created', 'community', c.id);
  db.save();
  res.status(201).json({ community: c });
}));
