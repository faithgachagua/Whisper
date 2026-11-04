import { Router } from 'express';
import { db } from '../../core/db';
import { authenticate } from '../../core/middleware';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get('/', (req, res) => {
  const mine = db.data.notifications.filter((n) => n.userId === req.user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ items: mine.slice(0, 50), unread: mine.filter((n) => !n.read).length });
});

notificationsRouter.post('/read-all', (req, res) => {
  db.data.notifications.forEach((n) => { if (n.userId === req.user!.id) n.read = true; });
  db.save();
  res.json({ ok: true });
});

notificationsRouter.post('/:id/read', (req, res) => {
  const n = db.data.notifications.find((x) => x.id === req.params.id && x.userId === req.user!.id);
  if (n) { n.read = true; db.save(); }
  res.json({ ok: true });
});
