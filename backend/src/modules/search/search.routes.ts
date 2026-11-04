import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../core/db';
import { authenticate, validate } from '../../core/middleware';
import { communityAllowedFor } from '../../core/serializers';
import { communityView } from '../communities/communities.routes';
import { postView, visiblePostsFor } from '../posts/posts.service';

export const searchRouter = Router();
searchRouter.use(authenticate);

const schema = z.object({ q: z.string().trim().min(2, 'Type at least 2 characters.').max(80) });

searchRouter.get('/', validate(schema, 'query'), (req, res) => {
  const q = (req.query as unknown as z.infer<typeof schema>).q.toLowerCase();
  const me = req.user!;
  const posts = visiblePostsFor(me).filter((p) => p.body.toLowerCase().includes(q)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20).map((p) => postView(p, me));
  const communities = db.data.communities
    .filter((c) => communityAllowedFor(me, c) && `${c.name} ${c.nameSw} ${c.description} ${c.descriptionSw}`.toLowerCase().includes(q))
    .map((c) => communityView(c, me));
  res.json({ posts, communities });
});
