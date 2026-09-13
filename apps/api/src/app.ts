import cors from 'cors';
import express from 'express';

import { openDatabase } from './db/client';
import { createCorsOptions, isAllowedOrigin } from './lib/cors';
import { resolveLimits } from './lib/env';
import { createAiAccessGuard, createAiRateLimiter, createAuthRateLimiter } from './middleware/ai-guard';
import { createOptionalAuth, requireAuth } from './middleware/auth';
import { createAuthRouter } from './routes/auth';
import { createCoachRouter } from './routes/coach';
import { createHealthRouter } from './routes/health';
import { createMeRouter } from './routes/me';
import { planRouter } from './routes/plan';
import { createSessionsRouter } from './routes/sessions';
import type { AppDeps } from './types';

export function createApp(overrides: Partial<AppDeps> = {}): express.Express {
  const env = overrides.env ?? process.env;
  const deps: AppDeps = {
    env,
    db: overrides.db ?? openDatabase(env),
    ...(overrides.aiClient ? { aiClient: overrides.aiClient } : {}),
  };

  const app = express();
  const limits = resolveLimits(deps.env);

  if (deps.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!isAllowedOrigin(typeof origin === 'string' ? origin : undefined, deps.env)) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }
    next();
  });
  app.use(cors(createCorsOptions(deps.env)));
  app.use(express.json({ limit: limits.jsonBodyLimit }));
  app.use(createOptionalAuth(deps));

  app.use('/health', createHealthRouter(deps));
  app.use('/auth', createAuthRateLimiter(deps), createAuthRouter(deps));
  app.use('/me', requireAuth(), createMeRouter(deps));
  app.use('/plan', planRouter);

  const aiGuard = [createAiAccessGuard(deps), createAiRateLimiter(deps)];
  app.use('/sessions', ...aiGuard, createSessionsRouter(deps));
  app.use('/coach', ...aiGuard, createCoachRouter(deps));

  return app;
}
