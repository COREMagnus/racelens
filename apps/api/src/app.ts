import cors from 'cors';
import express from 'express';

import { createCorsOptions, isAllowedOrigin } from './lib/cors';
import { resolveLimits } from './lib/env';
import { createAiAccessGuard, createAiRateLimiter } from './middleware/ai-guard';
import { createCoachRouter } from './routes/coach';
import { createHealthRouter } from './routes/health';
import { planRouter } from './routes/plan';
import { createSessionsRouter } from './routes/sessions';
import type { AppDeps } from './types';

export function createApp(overrides: Partial<AppDeps> = {}): express.Express {
  const deps: AppDeps = {
    env: overrides.env ?? process.env,
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

  app.use('/health', createHealthRouter(deps));
  app.use('/plan', planRouter);

  const aiGuard = [createAiAccessGuard(deps), createAiRateLimiter(deps)];
  app.use('/sessions', ...aiGuard, createSessionsRouter(deps));
  app.use('/coach', ...aiGuard, createCoachRouter(deps));

  return app;
}
