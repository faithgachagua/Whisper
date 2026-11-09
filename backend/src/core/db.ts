import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import type {
  AuditLog, Block, Comment, Community, Conversation, ImageRecord, Membership, Message, Notification,
  Post, Reaction, Report, Save, SupportRequest, User,
} from './types';

export interface Data {
  users: User[];
  communities: Community[];
  memberships: Membership[];
  posts: Post[];
  comments: Comment[];
  reactions: Reaction[];
  saves: Save[];
  blocks: Block[];
  supportRequests: SupportRequest[];
  conversations: Conversation[];
  messages: Message[];
  reports: Report[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  images: ImageRecord[];
}

const empty = (): Data => ({
  users: [], communities: [], memberships: [], posts: [], comments: [], reactions: [], saves: [],
  blocks: [], supportRequests: [], conversations: [], messages: [], reports: [], notifications: [], auditLogs: [], images: [],
});

/**
 * Tiny file-backed store so the API runs with zero setup.
 * Modules only touch `db.data` through their own service files, so swapping this
 * for PostgreSQL (Prisma, Drizzle, Knex…) means rewriting the services, not the routes.
 */
class Store {
  data: Data = empty();
  private timer: NodeJS.Timeout | null = null;

  load() {
    if (fs.existsSync(env.dataFile)) {
      this.data = { ...empty(), ...JSON.parse(fs.readFileSync(env.dataFile, 'utf8')) };
    }
  }

  /** Debounced write. */
  save() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 250);
  }

  flush() {
    fs.mkdirSync(path.dirname(env.dataFile), { recursive: true });
    const tmp = `${env.dataFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, env.dataFile);
  }
}

export const db = new Store();
export const newId = () => randomUUID();
export const now = () => new Date().toISOString();
