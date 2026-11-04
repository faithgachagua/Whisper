import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db, newId, now } from '../../core/db';
import { conflict, unauthorized } from '../../core/errors';
import { asyncHandler, authenticate, signToken, validate } from '../../core/middleware';
import { selfView } from '../../core/serializers';
import type { User } from '../../core/types';

const ADJECTIVES = ['Quiet', 'Gentle', 'Brave', 'Calm', 'Kind', 'Bright', 'Soft', 'Steady', 'Hopeful', 'Warm'];
const NOUNS = ['River', 'Moon', 'Hill', 'Star', 'Cloud', 'Lake', 'Sunrise', 'Breeze', 'Meadow', 'Dove'];

export function generatePseudonym(): string {
  for (let i = 0; i < 20; i++) {
    const name = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]}${NOUNS[Math.floor(Math.random() * NOUNS.length)]}${Math.floor(100 + Math.random() * 900)}`;
    if (!db.data.users.some((u) => u.pseudonym.toLowerCase() === name.toLowerCase())) return name;
  }
  return `Member${Date.now()}`;
}

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .regex(/[A-Za-z]/, 'Include at least one letter.')
    .regex(/\d/, 'Include at least one number.'),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the Terms of Service and Privacy Policy.' }) }),
  locale: z.enum(['en', 'sw']).default('en'),
});

const loginSchema = z.object({ identifier: z.string().trim().min(1, 'Enter your email or username.'), password: z.string().min(1, 'Enter your password.') });

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { email, password, locale } = req.body as z.infer<typeof registerSchema>;
  if (db.data.users.some((u) => u.email === email)) throw conflict('An account with this email already exists.', 'EMAIL_TAKEN');
  const user: User = {
    id: newId(), email, passwordHash: await bcrypt.hash(password, 11), pseudonym: generatePseudonym(), role: 'member', status: 'active',
    ageBand: null, ageTier: 'unknown', gender: null, interests: [], locale, onboarded: false, strikes: 0, showOnline: true, createdAt: now(), lastSeenAt: now(),
  };
  db.data.users.push(user);
  db.save();
  res.status(201).json({ token: signToken(user.id), user: selfView(user) });
}));

authRouter.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { identifier, password } = req.body as z.infer<typeof loginSchema>;
  const key = identifier.toLowerCase();
  const user = db.data.users.find((u) => u.status !== 'deleted' && (u.email === key || u.pseudonym.toLowerCase() === key));
  // Same error for unknown user and wrong password.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw unauthorized('Incorrect email/username or password.');
  res.json({ token: signToken(user.id), user: selfView(user) });
}));

authRouter.get('/me', authenticate, (req, res) => res.json({ user: selfView(req.user!) }));
