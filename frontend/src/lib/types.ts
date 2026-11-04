export type Role = 'member' | 'listener' | 'moderator' | 'admin';
export type AgeTier = 'youth' | 'adult' | 'unknown';
export type Locale = 'en' | 'sw';
export type ReactionType = 'listening' | 'not_alone' | 'sending_support';

export interface User {
  id: string; email: string; pseudonym: string; role: Role; status: string;
  ageBand: string | null; ageTier: AgeTier; gender: string | null; interests: string[]; locale: Locale; onboarded: boolean;
  showOnline?: boolean;
  listener?: { vetted: boolean; youthApproved: boolean; online: boolean; topics: string[] };
}

export interface Community {
  id: string; slug: string; name: string; nameSw: string; description: string; descriptionSw: string;
  youthSafe: boolean; memberCount: number; activeNow: number; joined: boolean; allowed: boolean;
}

export interface Post {
  id: string; community: { id: string; slug: string; name: string; nameSw: string } | null;
  author: { pseudonym: string; isMe: boolean; online?: boolean }; body: string; createdAt: string;
  reactions: Record<ReactionType, number>; reactionTotal: number; myReaction: ReactionType | null;
  commentCount: number; saved: boolean; mine: boolean;
}

export interface Comment { id: string; postId: string; parentId: string | null; body: string; createdAt: string; author: { pseudonym: string; isMe: boolean; online?: boolean } }

export interface SafetyPayload { crisis: true; message: string; resources: { id: string; name: string; contact: string; note: string }[] }

export interface Notification { id: string; type: string; title: string; body: string; link?: string; read: boolean; createdAt: string }

export interface Conversation {
  id: string; status: 'open' | 'closed'; createdAt: string; iAmListener: boolean;
  other: { pseudonym: string; label: string; id?: string; online?: boolean; lastSeenAt?: string | null }; lastMessage: { body: string; createdAt: string } | null;
}
export interface Message { id: string; body: string; createdAt: string; mine: boolean }

export interface ListenerRequest { id: string; topics: string[]; createdAt: string; waitingMinutes: number; requester: string; isYouth: boolean }
