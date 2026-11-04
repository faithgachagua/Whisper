import { db, newId, now } from './db';
import type { AgeBand, AgeTier, Community, User } from './types';

export const BAND_LABEL: Record<AgeBand, string> = {
  under_13: 'Under 13', '13_17': '13–17', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_plus': '45+', prefer_not_to_say: 'Prefer not to say',
};

export function tierFromBand(band: AgeBand | null | undefined): AgeTier {
  if (band === '13_17') return 'youth';
  if (band === '18_24' || band === '25_34' || band === '35_44' || band === '45_plus') return 'adult';
  return 'unknown';
}

/** Anything that is not a self-reported adult gets the stronger safeguards. */
export const isProtected = (u: Pick<User, 'ageTier'>) => u.ageTier !== 'adult';

/** What the user themself may see. Never includes the password hash. */
export function selfView(u: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, strikes, ...rest } = u;
  return rest;
}

export function ageGroupLabel(u: User) {
  if (u.ageTier === 'youth') return 'Young person (13–17)';
  if (u.ageTier === 'adult' && u.ageBand) return `Adult (${BAND_LABEL[u.ageBand]})`;
  return 'Member';
}

export const communityAllowedFor = (u: User, c: Community) => !isProtected(u) || c.youthSafe;

export const findUser = (id: string) => db.data.users.find((u) => u.id === id);
export const findCommunity = (id: string) => db.data.communities.find((c) => c.id === id);

/** Authors a viewer should not see: people they blocked/muted and people who blocked them. */
export function hiddenAuthorIds(viewerId: string): Set<string> {
  const hidden = new Set<string>();
  for (const b of db.data.blocks) {
    if (b.userId === viewerId) hidden.add(b.targetId);
    if (b.targetId === viewerId && b.kind === 'block') hidden.add(b.userId);
  }
  return hidden;
}

export function notify(userId: string, n: { type: 'reply' | 'reaction' | 'support' | 'moderation' | 'system'; title: string; body: string; link?: string }) {
  db.data.notifications.push({ id: newId(), userId, read: false, createdAt: now(), ...n });
}

export function audit(actorId: string, action: string, targetType?: string, targetId?: string, meta?: Record<string, unknown>) {
  db.data.auditLogs.push({ id: newId(), actorId, action, targetType, targetId, meta, createdAt: now() });
}
