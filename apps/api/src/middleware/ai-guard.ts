import { rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';

import { PRODUCTION_AI_DISABLED_MESSAGE, isUnauthenticatedAiAllowed } from '../lib/access';
import { resolveLimits } from '../lib/env';
import type { AppDeps } from '../types';

export function createAiAccessGuard(deps: AppDeps): RequestHandler {
  return (_req, res, next) => {
    if (!isUnauthenticatedAiAllowed(deps.env)) {
      res.status(503).json({ error: PRODUCTION_AI_DISABLED_MESSAGE });
      return;
    }
    next();
  };
}

export function createAiRateLimiter(deps: AppDeps): RequestHandler {
  const limits = resolveLimits(deps.env);
  if (limits.rateLimitMax <= 0) {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs: limits.rateLimitWindowMs,
    limit: limits.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests. Try again shortly.' },
  });
}
