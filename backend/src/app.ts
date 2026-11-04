import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './core/middleware';
import { apiRouter } from './modules';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '50kb' }));

  app.use('/api', rateLimit({ windowMs: 15 * 60_000, limit: 600, standardHeaders: true, legacyHeaders: false }));
  // Stricter limit on credential endpoints to slow down guessing.
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }));
  app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'whisper-api' }));
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
