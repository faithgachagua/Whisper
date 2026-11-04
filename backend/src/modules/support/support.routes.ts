import { RequestHandler, Router } from 'express';
import { z } from 'zod';
import { db, newId, now } from '../../core/db';
import { badRequest, conflict, forbidden, notFound } from '../../core/errors';
import { asyncHandler, assertCanPublish, authenticate, validate } from '../../core/middleware';
import { visiblePresence } from '../../core/presence';
import { hasCrisisLanguage, hasPersonalInfo, hasRiskyContactRequest, safetyPayload } from '../../core/safety';
import { ageGroupLabel, findUser, isProtected, notify } from '../../core/serializers';
import type { Conversation, SupportRequest, User } from '../../core/types';
import { flagForReview } from '../reports/reports.service';

export const supportRouter = Router();
supportRouter.use(authenticate);

const MAX_ACTIVE_CHATS_PER_LISTENER = 5;

const requireVettedListener: RequestHandler = (req, _res, next) => {
  const u = req.user!;
  if (u.role !== 'listener' || !u.listener?.vetted) return next(forbidden('Only vetted listeners can do this.', 'NOT_A_LISTENER'));
  next();
};

const isBlockedEitherWay = (a: string, b: string) =>
  db.data.blocks.some((x) => x.kind === 'block' && ((x.userId === a && x.targetId === b) || (x.userId === b && x.targetId === a)));

/** Which pending requests may this listener see? */
function eligibleRequests(listener: User): SupportRequest[] {
  const lp = listener.listener!;
  return db.data.supportRequests.filter((r) => {
    if (r.status !== 'pending' || r.requesterId === listener.id || r.declinedBy.includes(listener.id)) return false;
    // Young or unverified-age members are only ever matched with listeners approved for youth.
    if (r.requiresYouthApproved && !lp.youthApproved) return false;
    if (isBlockedEitherWay(r.requesterId, listener.id)) return false;
    if (lp.topics.length > 0 && !r.topics.some((t) => lp.topics.includes(t))) return false;
    return true;
  });
}

const requestView = (r: SupportRequest) => {
  const requester = findUser(r.requesterId);
  return {
    id: r.id, topics: r.topics, createdAt: r.createdAt,
    waitingMinutes: Math.max(0, Math.round((Date.now() - new Date(r.createdAt).getTime()) / 60_000)),
    requester: requester ? ageGroupLabel(requester) : 'Member',
    isYouth: r.requiresYouthApproved,
  };
};

// ---------- member side ----------
const requestSchema = z.object({ topics: z.array(z.string().max(40)).min(1, 'Pick at least one topic.').max(5) });

supportRouter.post('/requests', validate(requestSchema), asyncHandler((req, res) => {
  const user = req.user!;
  assertCanPublish(user);
  if (!user.onboarded) throw badRequest('Finish setting up your account first.', 'NOT_ONBOARDED');
  const open = db.data.supportRequests.find((r) => r.requesterId === user.id && r.status === 'pending');
  if (open) return res.json({ request: requestView(open), status: open.status });
  const activeChat = db.data.conversations.find((c) => c.memberId === user.id && c.status === 'open');
  if (activeChat) throw conflict('You already have an open conversation.', 'ACTIVE_CONVERSATION');
  const request: SupportRequest = {
    id: newId(), requesterId: user.id, topics: (req.body as z.infer<typeof requestSchema>).topics, mode: 'text', status: 'pending',
    requiresYouthApproved: isProtected(user), declinedBy: [], createdAt: now(),
  };
  db.data.supportRequests.push(request);
  db.save();
  res.status(201).json({ request: requestView(request), status: request.status });
}));

supportRouter.get('/requests/mine', (req, res) => {
  const mine = db.data.supportRequests.filter((r) => r.requesterId === req.user!.id && (r.status === 'pending' || r.status === 'matched'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!mine) return res.json({ request: null });
  const conv = mine.conversationId ? db.data.conversations.find((c) => c.id === mine.conversationId) : undefined;
  res.json({ request: { ...requestView(mine), status: mine.status, conversationId: conv && conv.status === 'open' ? conv.id : null } });
});

supportRouter.post('/requests/:id/cancel', (req, res) => {
  const r = db.data.supportRequests.find((x) => x.id === req.params.id && x.requesterId === req.user!.id);
  if (!r) throw notFound('Request not found.');
  if (r.status === 'pending') { r.status = 'cancelled'; db.save(); }
  res.json({ ok: true });
});

// ---------- listener side ----------
supportRouter.put('/listener/availability', requireVettedListener, validate(z.object({ online: z.boolean() })), (req, res) => {
  req.user!.listener!.online = (req.body as { online: boolean }).online;
  db.save();
  res.json({ online: req.user!.listener!.online });
});

supportRouter.get('/listener/dashboard', requireVettedListener, (req, res) => {
  const me = req.user!;
  const today = now().slice(0, 10);
  const mine = db.data.conversations.filter((c) => c.listenerId === me.id);
  const requests = me.listener!.online ? eligibleRequests(me) : [];
  res.json({
    online: me.listener!.online,
    youthApproved: me.listener!.youthApproved,
    stats: { todaySessions: mine.filter((c) => c.createdAt.slice(0, 10) === today).length, activeChats: mine.filter((c) => c.status === 'open').length, pendingRequests: requests.length },
    requests: requests.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(requestView),
  });
});

supportRouter.post('/listener/requests/:id/accept', requireVettedListener, asyncHandler((req, res) => {
  const me = req.user!;
  const r = eligibleRequests(me).find((x) => x.id === req.params.id);
  if (!r) throw conflict('This request is no longer available.', 'REQUEST_UNAVAILABLE');
  if (db.data.conversations.filter((c) => c.listenerId === me.id && c.status === 'open').length >= MAX_ACTIVE_CHATS_PER_LISTENER) {
    throw conflict('Finish one of your open conversations before accepting another.', 'TOO_MANY_CHATS');
  }
  const conv: Conversation = { id: newId(), requestId: r.id, memberId: r.requesterId, listenerId: me.id, status: 'open', createdAt: now() };
  db.data.conversations.push(conv);
  r.status = 'matched'; r.listenerId = me.id; r.conversationId = conv.id;
  notify(r.requesterId, { type: 'support', title: 'A listener is ready', body: 'Someone is here to listen. Open the chat when you are ready.', link: `/talk/${conv.id}` });
  db.save();
  res.json({ conversationId: conv.id });
}));

supportRouter.post('/listener/requests/:id/decline', requireVettedListener, (req, res) => {
  const r = db.data.supportRequests.find((x) => x.id === req.params.id);
  if (r && r.status === 'pending' && !r.declinedBy.includes(req.user!.id)) { r.declinedBy.push(req.user!.id); db.save(); }
  res.json({ ok: true });
});

// ---------- conversations ----------
function loadConversation(req: Parameters<RequestHandler>[0]): { conv: Conversation; me: User; iAmListener: boolean } {
  const me = req.user!;
  const conv = db.data.conversations.find((c) => c.id === req.params.id);
  if (!conv || (conv.memberId !== me.id && conv.listenerId !== me.id)) throw notFound('Conversation not found.');
  return { conv, me, iAmListener: conv.listenerId === me.id };
}

function convView(conv: Conversation, me: User) {
  const iAmListener = conv.listenerId === me.id;
  const other = findUser(iAmListener ? conv.memberId : conv.listenerId);
  const last = db.data.messages.filter((m) => m.conversationId === conv.id).slice(-1)[0];
  return {
    id: conv.id, status: conv.status, createdAt: conv.createdAt, iAmListener,
    other: { pseudonym: other?.pseudonym ?? 'Former member', label: iAmListener ? (other ? ageGroupLabel(other) : 'Member') : 'Peer listener', id: other?.id, ...(other ? visiblePresence(other) : { online: false, lastSeenAt: null }) },
    lastMessage: last ? { body: last.body.slice(0, 80), createdAt: last.createdAt } : null,
  };
}

supportRouter.get('/conversations', (req, res) => {
  const me = req.user!;
  const items = db.data.conversations.filter((c) => c.memberId === me.id || c.listenerId === me.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((c) => convView(c, me));
  res.json({ items });
});

supportRouter.get('/conversations/:id', (req, res) => {
  const { conv, me, iAmListener } = loadConversation(req);
  const after = typeof req.query.after === 'string' ? req.query.after : '';
  const all = db.data.messages.filter((m) => m.conversationId === conv.id);
  const messages = all.filter((m) => m.createdAt > after).map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt, mine: m.senderId === me.id }));
  res.json({
    conversation: convView(conv, me), messages,
    // Tells a listener to follow the escalation steps without exposing anything else.
    escalationHint: iAmListener && all.some((m) => m.flagged && m.senderId === conv.memberId),
  });
});

const messageSchema = z.object({ body: z.string().trim().min(1).max(1000) });

supportRouter.post('/conversations/:id/messages', validate(messageSchema), asyncHandler((req, res) => {
  const { conv, me } = loadConversation(req);
  assertCanPublish(me);
  if (conv.status !== 'open') throw conflict('This conversation has ended.', 'CONVERSATION_CLOSED');
  const { body } = req.body as z.infer<typeof messageSchema>;
  const member = findUser(conv.memberId)!;
  // Protected interactions: members who are young or of unverified age cannot exchange contact details.
  if (isProtected(member) && hasPersonalInfo(body)) {
    throw badRequest('For everyone’s safety, contact details can’t be shared in chat.', 'CONTAINS_PERSONAL_INFO');
  }
  const crisis = hasCrisisLanguage(body);
  const risky = me.id === conv.listenerId && isProtected(member) && hasRiskyContactRequest(body);
  const msg = { id: newId(), conversationId: conv.id, senderId: me.id, body, flagged: crisis || risky, createdAt: now() };
  db.data.messages.push(msg);
  if (crisis) flagForReview('conversation', conv.id, 'crisis_language', 'Automatic: possible crisis language in a support chat.');
  if (risky) flagForReview('conversation', conv.id, 'grooming', 'Automatic: listener message to a protected member matched a risky-contact pattern.');
  const otherId = me.id === conv.memberId ? conv.listenerId : conv.memberId;
  notify(otherId, { type: 'support', title: 'New message', body: 'You have a new message.', link: `/talk/${conv.id}` });
  db.save();
  res.status(201).json({
    message: { id: msg.id, body: msg.body, createdAt: msg.createdAt, mine: true },
    safety: crisis && me.id === conv.memberId ? safetyPayload(member.ageTier) : null,
  });
}));

supportRouter.post('/conversations/:id/leave', (req, res) => {
  const { conv, me } = loadConversation(req);
  if (conv.status === 'open') {
    conv.status = 'closed'; conv.closedBy = me.id;
    const r = db.data.supportRequests.find((x) => x.id === conv.requestId);
    if (r) r.status = 'closed';
    notify(me.id === conv.memberId ? conv.listenerId : conv.memberId, { type: 'support', title: 'Conversation ended', body: 'The other person has left the conversation.' });
    db.save();
  }
  res.json({ ok: true });
});
