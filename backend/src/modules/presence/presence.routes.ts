import { Router } from 'express';
import { db, now } from '../../core/db';
import { authenticate } from '../../core/middleware';
import { isOnline, isStaff } from '../../core/presence';

export const presenceRouter = Router();
presenceRouter.use(authenticate);

/** Anonymous totals only — no names. */
function summary(staff: boolean) {
  const users = db.data.users;
  return {
    // Total online is a staff-only statistic.
    onlineNow: staff ? users.filter(isOnline).length : 0,
    listenersOnline: users.filter((u) => u.role === 'listener' && u.listener?.vetted && u.listener.online && isOnline(u)).length,
  };
}

/** The web app calls this every ~30s while the tab is visible ("active now"). */
presenceRouter.post('/heartbeat', (req, res) => {
  req.user!.lastSeenAt = now();
  db.save();
  res.json(summary(isStaff(req.user!)));
});

presenceRouter.get('/summary', (req, res) => res.json(summary(isStaff(req.user!))));
