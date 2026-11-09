import { Router } from 'express';
import { z } from 'zod';
import { db, now } from '../../core/db';
import { badRequest, forbidden, notFound } from '../../core/errors';
import { asyncHandler, authenticate, requireRole, validate } from '../../core/middleware';
import { SAFETY_RESOURCES } from '../../config/safety';
import { isOnline } from '../../core/presence';
import { ageGroupLabel, audit, findUser, notify } from '../../core/serializers';
import type { Report } from '../../core/types';
import { attachedImages, removeImages, signedUrl } from '../uploads/uploads.service';

export const moderationRouter = Router();
moderationRouter.use(authenticate, requireRole('moderator', 'admin'));

/** Who is the report really about, and what content is involved? */
function resolveTarget(r: Report): { authorId: string | null; content: string } {
  if (r.targetType === 'post') { const p = db.data.posts.find((x) => x.id === r.targetId); return { authorId: p?.authorId ?? null, content: p?.body ?? '' }; }
  if (r.targetType === 'comment') { const c = db.data.comments.find((x) => x.id === r.targetId); return { authorId: c?.authorId ?? null, content: c?.body ?? '' }; }
  if (r.targetType === 'user') return { authorId: r.targetId, content: '' };
  const conv = db.data.conversations.find((x) => x.id === r.targetId);
  if (!conv) return { authorId: null, content: '' };
  // System flags about crisis concern the member; user reports concern the other participant.
  if (r.reporterId === 'system') return { authorId: r.reason === 'grooming' ? conv.listenerId : conv.memberId, content: '' };
  return { authorId: r.reporterId === conv.memberId ? conv.listenerId : conv.memberId, content: '' };
}

/** Staff-only: everyone online right now (true presence, regardless of the member's chat-visibility setting). */
moderationRouter.get('/online', (_req, res) => {
  const online = db.data.users.filter(isOnline);
  const byRole = { member: 0, listener: 0, moderator: 0, admin: 0 };
  online.forEach((u) => { byRole[u.role] += 1; });
  res.json({
    total: online.length, byRole,
    items: online.slice(0, 100).map((u) => ({ pseudonym: u.pseudonym, role: u.role, group: ageGroupLabel(u) })),
  });
});

/** Complaints over the last 14 days, plus a breakdown by reason. */
moderationRouter.get('/report-stats', (_req, res) => {
  const day = (iso: string) => iso.slice(0, 10);
  const daily = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() - (13 - i) * 86_400_000).toISOString().slice(0, 10);
    return {
      date,
      filed: db.data.reports.filter((r) => day(r.createdAt) === date).length,
      resolved: db.data.reports.filter((r) => r.resolution && day(r.resolution.at) === date).length,
    };
  });
  const reasons = new Map<string, number>();
  db.data.reports.forEach((r) => reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1));
  res.json({
    daily,
    byReason: [...reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    totals: {
      open: db.data.reports.filter((r) => r.status === 'open').length,
      resolved: db.data.reports.filter((r) => r.status === 'resolved').length,
      dismissed: db.data.reports.filter((r) => r.status === 'dismissed').length,
    },
  });
});

const listQuery = z.object({
  status: z.enum(['open', 'resolved', 'dismissed', 'all']).default('open'),
  priority: z.enum(['normal', 'urgent']).optional(),
});

moderationRouter.get('/stats', (_req, res) => {
  const today = now().slice(0, 10);
  res.json({
    openReports: db.data.reports.filter((r) => r.status === 'open').length,
    urgentReports: db.data.reports.filter((r) => r.status === 'open' && r.priority === 'urgent').length,
    resolvedToday: db.data.reports.filter((r) => r.resolution?.at.slice(0, 10) === today).length,
    restrictedUsers: db.data.users.filter((u) => u.status === 'restricted').length,
  });
});

moderationRouter.get('/reports', validate(listQuery, 'query'), (req, res) => {
  const q = req.query as unknown as z.infer<typeof listQuery>;
  const items = db.data.reports
    .filter((r) => (q.status === 'all' || r.status === q.status) && (!q.priority || r.priority === q.priority))
    .sort((a, b) => (a.priority === b.priority ? b.createdAt.localeCompare(a.createdAt) : a.priority === 'urgent' ? -1 : 1))
    .slice(0, 100)
    .map((r) => ({
      id: r.id, targetType: r.targetType, reason: r.reason, priority: r.priority, status: r.status, createdAt: r.createdAt,
      source: r.reporterId === 'system' ? 'automatic' : 'member', preview: resolveTarget(r).content.slice(0, 140),
    }));
  res.json({ items });
});

moderationRouter.get('/reports/:id', (req, res) => {
  const r = db.data.reports.find((x) => x.id === req.params.id);
  if (!r) throw notFound('Report not found.');
  const t = resolveTarget(r);
  const author = t.authorId ? findUser(t.authorId) : undefined;
  // Conversation content is only visible to moderators through a report about that conversation.
  const messages = r.targetType === 'conversation'
    ? db.data.messages.filter((m) => m.conversationId === r.targetId).slice(-50).map((m) => ({
        id: m.id, body: m.body, createdAt: m.createdAt, flagged: m.flagged,
        imageUrl: m.imageId && db.data.images.some((i) => i.id === m.imageId && i.status === 'attached') ? signedUrl(m.imageId) : null,
        sender: m.senderId === db.data.conversations.find((c) => c.id === r.targetId)?.listenerId ? 'listener' : 'member',
      }))
    : [];
  res.json({
    report: r, content: t.content, messages,
    images: r.targetType === 'post' ? attachedImages(db.data.posts.find((x) => x.id === r.targetId)?.imageIds) : [],
    subject: author ? { id: author.id, pseudonym: author.pseudonym, status: author.status, strikes: author.strikes, group: ageGroupLabel(author), role: author.role } : null,
    priorReports: t.authorId ? db.data.reports.filter((x) => x.id !== r.id && resolveTarget(x).authorId === t.authorId).length : 0,
  });
});

const resolveSchema = z.object({
  action: z.enum(['dismiss', 'remove_content', 'warn', 'restrict', 'suspend', 'ban', 'send_support_resources']),
  note: z.string().trim().max(500).default(''),
});

moderationRouter.post('/reports/:id/resolve', validate(resolveSchema), asyncHandler((req, res) => {
  const mod = req.user!;
  const { action, note } = req.body as z.infer<typeof resolveSchema>;
  const r = db.data.reports.find((x) => x.id === req.params.id);
  if (!r) throw notFound('Report not found.');
  if (r.status !== 'open') throw badRequest('This report has already been handled.', 'ALREADY_HANDLED');
  if (action === 'ban' && mod.role !== 'admin') throw forbidden('Only admins can ban accounts.');
  if (r.reason === 'crisis_language' && !['dismiss', 'send_support_resources'].includes(action)) {
    throw badRequest('For automatic crisis flags, send support resources or dismiss.', 'INVALID_ACTION');
  }

  const t = resolveTarget(r);
  const subject = t.authorId ? findUser(t.authorId) : undefined;
  if (subject && subject.id === mod.id) throw badRequest('You cannot take action against your own account.');
  if (subject && subject.role === 'admin' && mod.role !== 'admin') throw forbidden('Only admins can act on admin accounts.');
  if (action !== 'dismiss' && !subject && action !== 'remove_content') throw badRequest('The account for this report no longer exists.');

  switch (action) {
    case 'dismiss': break;
    case 'remove_content': {
      if (r.targetType === 'post') { const p = db.data.posts.find((x) => x.id === r.targetId); if (p) { p.status = 'removed'; removeImages(p.imageIds ?? []); } }
      else if (r.targetType === 'comment') { const c = db.data.comments.find((x) => x.id === r.targetId); if (c) c.status = 'removed'; }
      else if (r.targetType === 'conversation') {
        removeImages(db.data.messages.filter((m) => m.conversationId === r.targetId && m.imageId).map((m) => m.imageId!));
      } else throw badRequest('Only posts, comments and chat photos can be removed.');
      if (subject) notify(subject.id, { type: 'moderation', title: 'Your content was removed', body: note || 'It broke our community guidelines.', link: '/help' });
      break;
    }
    case 'warn':
      subject!.strikes += 1;
      notify(subject!.id, { type: 'moderation', title: 'A reminder about our guidelines', body: note || 'Please keep Whisper kind and safe for everyone.', link: '/help' });
      break;
    case 'restrict':
      subject!.strikes += 1; subject!.status = 'restricted'; subject!.restrictedUntil = new Date(Date.now() + 7 * 86_400_000).toISOString();
      notify(subject!.id, { type: 'moderation', title: 'Your account is restricted for 7 days', body: note || 'You can read but not post.', link: '/help' });
      break;
    case 'suspend': subject!.strikes += 1; subject!.status = 'suspended'; break;
    case 'ban': subject!.strikes += 1; subject!.status = 'banned'; break;
    case 'send_support_resources':
      notify(subject!.id, {
        type: 'system', title: 'Support is available',
        body: `You matter. If things feel heavy, you can talk to someone: ${SAFETY_RESOURCES.filter((x) => x.audience === 'all').map((x) => `${x.name} ${x.contact}`).join(' · ')}.`,
        link: '/talk',
      });
      break;
  }

  r.status = action === 'dismiss' ? 'dismissed' : 'resolved';
  r.resolution = { action, note, by: mod.id, at: now() };
  audit(mod.id, `moderation.${action}`, r.targetType, r.targetId, { reportId: r.id, subjectId: subject?.id });
  db.save();
  res.json({ ok: true });
}));
