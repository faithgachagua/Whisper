import { Router } from 'express';
import { COMMUNITY_RULES, SAFETY_RESOURCES } from '../../config/safety';

export const safetyRouter = Router();

/** Public so that people who are logged out (or locked out) can still find help. */
safetyRouter.get('/resources', (_req, res) => res.json({ resources: SAFETY_RESOURCES, rules: COMMUNITY_RULES }));
