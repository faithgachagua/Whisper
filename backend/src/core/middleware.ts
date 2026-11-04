import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError, ZodTypeAny } from 'zod';
import { env } from '../config/env';
import { db, now } from './db';
import { HttpError, forbidden, unauthorized } from './errors';
import type { Role, User } from './types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: User }
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const signToken = (userId: string) =>
  jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized());
  let sub: string;
  try {
    sub = (jwt.verify(header.slice(7), env.jwtSecret) as { sub: string }).sub;
  } catch {
    return next(unauthorized('Your session has expired. Please log in again.'));
  }
  const user = db.data.users.find((u) => u.id === sub);
  if (!user || user.status === 'deleted') return next(unauthorized());
  if (user.status === 'banned') return next(forbidden('This account has been banned.', 'ACCOUNT_BANNED'));
  if (user.status === 'suspended') return next(forbidden('This account is suspended.', 'ACCOUNT_SUSPENDED'));
  if (user.status === 'restricted' && user.restrictedUntil && user.restrictedUntil < now()) {
    user.status = 'active';
    user.restrictedUntil = undefined;
  }
  if (Date.now() - new Date(user.lastSeenAt).getTime() > 20_000) {
    user.lastSeenAt = now();
    db.save();
  }
  req.user = user;
  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => (req.user && roles.includes(req.user.role) ? next() : next(forbidden()));

export const validate =
  (schema: ZodTypeAny, source: 'body' | 'query' | 'params' = 'body'): RequestHandler =>
  (req, _res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) return next(parsed.error);
    (req as unknown as Record<string, unknown>)[source] = parsed.data;
    next();
  };

/** Throws when a restricted user tries to publish content. */
export function assertCanPublish(user: User) {
  if (user.status === 'restricted') {
    throw forbidden('Your account is temporarily restricted, so you can read but not post.', 'ACCOUNT_RESTRICTED');
  }
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Route not found.'));

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message ?? 'Invalid input.', issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
    });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
};
