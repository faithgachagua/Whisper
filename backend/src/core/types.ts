export type Role = 'member' | 'listener' | 'moderator' | 'admin';
export type AgeBand = 'under_13' | '13_17' | '18_24' | '25_34' | '35_44' | '45_plus' | 'prefer_not_to_say';
export type Gender = 'female' | 'male' | 'non_binary' | 'other' | 'prefer_not_to_say';
/** Derived safeguarding tier. "unknown" is treated like "youth" for protections. */
export type AgeTier = 'youth' | 'adult' | 'unknown';
export type AccountStatus = 'active' | 'restricted' | 'suspended' | 'banned' | 'deleted';
export type Locale = 'en' | 'sw';
export type ReactionType = 'listening' | 'not_alone' | 'sending_support';

export interface ListenerProfile {
  vetted: boolean;
  youthApproved: boolean;
  online: boolean;
  topics: string[];
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  pseudonym: string;
  role: Role;
  status: AccountStatus;
  ageBand: AgeBand | null;
  ageTier: AgeTier;
  gender: Gender | null;
  interests: string[];
  locale: Locale;
  onboarded: boolean;
  strikes: number;
  /** Let people in your chats see when you are online. Missing = on. */
  showOnline?: boolean;
  restrictedUntil?: string;
  listener?: ListenerProfile;
  createdAt: string;
  lastSeenAt: string;
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  nameSw: string;
  description: string;
  descriptionSw: string;
  youthSafe: boolean;
  /** Photos are not allowed here. */
  noImages?: boolean;
  /** Also reject links, for communities where identifying people is a risk. */
  strictIdentity?: boolean;
  rules?: string[];
  rulesSw?: string[];
}

export interface Membership { userId: string; communityId: string; joinedAt: string }

export interface Post {
  id: string;
  authorId: string;
  communityId: string;
  body: string;
  anonymous: boolean;
  imageIds?: string[];
  status: 'visible' | 'removed';
  crisisFlag: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  anonymous: boolean;
  status: 'visible' | 'removed';
  createdAt: string;
}

export interface Reaction { postId: string; userId: string; type: ReactionType }
export interface Save { postId: string; userId: string; createdAt: string }
export interface Block { userId: string; targetId: string; kind: 'block' | 'mute'; createdAt: string }

export interface SupportRequest {
  id: string;
  requesterId: string;
  topics: string[];
  mode: 'text';
  status: 'pending' | 'matched' | 'cancelled' | 'closed';
  requiresYouthApproved: boolean;
  declinedBy: string[];
  listenerId?: string;
  conversationId?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  requestId: string;
  memberId: string;
  listenerId: string;
  status: 'open' | 'closed';
  closedBy?: string;
  createdAt: string;
}

export interface Message { id: string; conversationId: string; senderId: string; body: string; imageId?: string; flagged: boolean; createdAt: string }

export interface ImageRecord {
  id: string;
  ownerId: string;
  status: 'pending' | 'attached' | 'removed';
  context: 'post' | 'message';
  bytes: number;
  width: number;
  height: number;
  createdAt: string;
}

export type ReportReason = 'harassment' | 'hate' | 'self_harm' | 'sexual_content' | 'spam' | 'grooming' | 'doxxing' | 'other';
export type ReportTarget = 'post' | 'comment' | 'user' | 'conversation';

export interface Report {
  id: string;
  /** "system" for automatic flags such as crisis language */
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason | 'crisis_language';
  details: string;
  priority: 'normal' | 'urgent';
  status: 'open' | 'resolved' | 'dismissed';
  resolution?: { action: string; note: string; by: string; at: string };
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'reply' | 'reaction' | 'support' | 'moderation' | 'system';
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}
