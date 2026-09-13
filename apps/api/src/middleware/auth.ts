import type { RequestHandler } from 'express';

import { findAuthByTokenHash } from '../db/store';
import { hashSessionToken } from '../lib/token';
import type { AppDeps } from '../types';

export const AUTH_REQUIRED_MESSAGE = 'Sign in required.';
export const INVALID_TOKEN_MESSAGE = 'Invalid or expired session.';

export function readBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^(Bearer)\s+(\S+)$/i.exec(header.trim());
  return match?.[2] ?? null;
}

export function createOptionalAuth(deps: AppDeps): RequestHandler {
  return (req, res, next) => {
    const header = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    if (!header) {
      next();
      return;
    }
    const token = readBearerToken(header);
    if (!token) {
      res.status(401).json({ error: INVALID_TOKEN_MESSAGE });
      return;
    }
    const auth = findAuthByTokenHash(deps.db, hashSessionToken(token));
    if (!auth) {
      res.status(401).json({ error: INVALID_TOKEN_MESSAGE });
      return;
    }
    res.locals.auth = auth;
    next();
  };
}

export function requireAuth(): RequestHandler {
  return (_req, res, next) => {
    if (!res.locals.auth?.user) {
      res.status(401).json({ error: AUTH_REQUIRED_MESSAGE });
      return;
    }
    next();
  };
}
