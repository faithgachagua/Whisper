import type { User } from './types';

/** Someone counts as "online" if their app (tab visible) pinged us within this window. */
export const ONLINE_WINDOW_MS = 2 * 60_000;

export function isOnline(u: Pick<User, 'status' | 'lastSeenAt'>): boolean {
  return (u.status === 'active' || u.status === 'restricted') && Date.now() - new Date(u.lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

/** Moderators and admins are the only roles that see presence statistics. */
export const isStaff = (u: Pick<User, 'role'>) => u.role === 'moderator' || u.role === 'admin';

/**
 * What *other members* may see about one person. Honors "show when I'm online".
 * Presence is only ever shown inside a conversation or as anonymous totals,
 * never as a public list of who is online.
 */
export function visiblePresence(u: User): { online: boolean; lastSeenAt: string | null } {
  if (u.showOnline === false) return { online: false, lastSeenAt: null };
  const online = isOnline(u);
  return { online, lastSeenAt: online ? null : u.lastSeenAt };
}
