import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { IMAGES_ADULTS_ONLY } from '../../config/safety';
import { badRequest, forbidden, notFound } from '../../core/errors';
import { asyncHandler, assertCanPublish, authenticate } from '../../core/middleware';
import { isProtected } from '../../core/serializers';
import { fileFor, saveImage, signedUrl, verifyToken } from './uploads.service';

export const uploadsRouter = Router();

/** Fetch a photo with a signed, short-lived token (issued only to people allowed to see it). */
uploadsRouter.get('/:id', (req, res) => {
  const id = String(req.params.id);
  const file = verifyToken(id, req.query.t) ? fileFor(id) : null;
  if (!file) throw notFound('Photo not available.');
  res.set({
    'Content-Type': 'image/webp',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; img-src 'self'",
    'Cross-Origin-Resource-Policy': 'cross-origin', // the web app is served from another origin
  });
  res.sendFile(file);
});

const limiter = rateLimit({ windowMs: 60 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => req.user?.id ?? 'anon' });

/** POST /api/uploads?context=post|message with the raw image bytes as the body. */
uploadsRouter.post('/', authenticate, limiter, express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }), asyncHandler(async (req, res) => {
  const user = req.user!;
  assertCanPublish(user);
  if (IMAGES_ADULTS_ONLY && isProtected(user)) throw forbidden('Photo sharing is for adult members only, to keep younger members safe.', 'IMAGES_NOT_AVAILABLE');
  const context = req.query.context === 'message' ? 'message' : 'post';
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw badRequest('Send a JPEG, PNG or WebP image (max 5 MB).', 'UNSUPPORTED_IMAGE');
  const rec = await saveImage(user.id, req.body, context);
  res.status(201).json({ image: { id: rec.id, url: signedUrl(rec.id) } });
}));
