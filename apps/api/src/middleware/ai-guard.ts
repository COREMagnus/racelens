import { rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';

import { AUTH_REQUIRED_AI_MESSAGE, isAiRouteAllowed } from '../lib/access';
import { resolveLimits } from '../lib/env';
import type { AppDeps } from '../types';

export function createAiAccessGuard(deps: AppDeps): RequestHandler {
  return (_req, res, next) => {
    const authenticated = Boolean(res.locals.auth?.user);
    if (!isAiRouteAllowed(deps.env, authenticated)) {
      res.status(401).json({ error: AUTH_REQUIRED_AI_MESSAGE });
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

export function createAuthRateLimiter(deps: AppDeps): RequestHandler {
  const windowMs = positiveInt(deps.env.AUTH_RATE_LIMIT_WINDOW_MS, 60_000);
  const max = nonNegativeInt(deps.env.AUTH_RATE_LIMIT_MAX, 20);
  if (max <= 0) {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Try again shortly.' },
  });
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function nonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}
