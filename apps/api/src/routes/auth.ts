import type { AuthSessionResponse } from '@racelens/shared';
import { Router } from 'express';
import { ZodError, z } from 'zod';

import {
  createAuthSession,
  createUser,
  deleteAuthSession,
  findUserByEmail,
  getSnapshot,
} from '../db/store';
import { formatZodError } from '../ai/request-schema';
import { MAX_EMAIL_CHARS, MAX_PASSWORD_CHARS, MIN_PASSWORD_CHARS, isValidEmail, normalizeEmail } from '../lib/email';
import { hashPassword, verifyPassword } from '../lib/password';
import { createSessionToken, hashSessionToken, sessionDays, sessionExpiryIso } from '../lib/token';
import type { AppDeps } from '../types';

const credentialsSchema = z.object({
  email: z.string().min(1).max(MAX_EMAIL_CHARS),
  password: z.string().min(MIN_PASSWORD_CHARS).max(MAX_PASSWORD_CHARS),
});

export function createAuthRouter(deps: AppDeps): Router {
  const router = Router();

  router.post('/register', (req, res) => {
    try {
      const body = credentialsSchema.parse(req.body);
      const email = normalizeEmail(body.email);
      if (!isValidEmail(email)) {
        res.status(400).json({ error: 'Enter a valid email address.' });
        return;
      }
      if (findUserByEmail(deps.db, email)) {
        res.status(409).json({ error: 'An account with that email already exists.' });
        return;
      }
      const user = createUser(deps.db, email, hashPassword(body.password, deps.env));
      res.status(201).json(issueSession(deps, user.id, user.email));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: formatZodError(error) });
        return;
      }
      throw error;
    }
  });

  router.post('/login', (req, res) => {
    try {
      const body = credentialsSchema.parse(req.body);
      const email = normalizeEmail(body.email);
      const user = findUserByEmail(deps.db, email);
      if (!user || !verifyPassword(body.password, user.passwordHash)) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      res.json(issueSession(deps, user.id, user.email));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: formatZodError(error) });
        return;
      }
      throw error;
    }
  });

  router.post('/logout', (_req, res) => {
    const sessionId = res.locals.auth?.sessionId as string | undefined;
    if (sessionId) {
      deleteAuthSession(deps.db, sessionId);
    }
    res.json({ ok: true });
  });

  return router;
}

function issueSession(deps: AppDeps, userId: string, email: string): AuthSessionResponse {
  const token = createSessionToken();
  createAuthSession(deps.db, userId, hashSessionToken(token), sessionExpiryIso(new Date(), sessionDays(deps.env)));
  const snapshot = getSnapshot(deps.db, { id: userId, email });
  return { token, ...snapshot };
}
