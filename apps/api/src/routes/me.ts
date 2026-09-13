import { generateStarterWeek, parseStoredAthleteProfile, parseStoredSession, parseStoredWeekPlan } from '@racelens/shared';
import { Router } from 'express';
import { ZodError, z } from 'zod';

import {
  createAthleteProfileBodySchema,
  createSessionSchema,
  createWeekPlanSchema,
  formatZodError,
} from '../ai/request-schema';
import { getPlan, getSnapshot, listSessions, putPlan, putProfile, upsertSession } from '../db/store';
import { resolveLimits } from '../lib/env';
import type { AppDeps } from '../types';

export function createMeRouter(deps: AppDeps): Router {
  const router = Router();
  const limits = resolveLimits(deps.env);
  const profileSchema = createAthleteProfileBodySchema(limits);
  const sessionSchema = createSessionSchema(limits);
  const weekPlanSchema = createWeekPlanSchema(limits);
  const planBodySchema = z.object({
    plan: weekPlanSchema.nullable(),
  });

  router.get('/', (_req, res) => {
    res.json(getSnapshot(deps.db, res.locals.auth.user));
  });

  router.get('/profile', (_req, res) => {
    const snapshot = getSnapshot(deps.db, res.locals.auth.user);
    res.json({ profile: snapshot.profile });
  });

  router.put('/profile', (req, res) => {
    try {
      const body = profileSchema.parse(req.body);
      const profile = putProfile(deps.db, res.locals.auth.user.id, parseStoredAthleteProfile(body));
      const starter = generateStarterWeek(profile);
      const plan = putPlan(deps.db, res.locals.auth.user.id, starter);
      res.json({ profile, plan });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: formatZodError(error) });
        return;
      }
      throw error;
    }
  });

  router.get('/sessions', (_req, res) => {
    res.json({ sessions: listSessions(deps.db, res.locals.auth.user.id) });
  });

  router.post('/sessions', (req, res) => {
    try {
      const parsed = parseStoredSession(sessionSchema.parse(req.body));
      if (!parsed) {
        res.status(400).json({ error: 'Invalid session.' });
        return;
      }
      const session = upsertSession(deps.db, res.locals.auth.user.id, parsed);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: formatZodError(error) });
        return;
      }
      throw error;
    }
  });

  router.get('/plan', (_req, res) => {
    res.json({ plan: getPlan(deps.db, res.locals.auth.user.id) });
  });

  router.put('/plan', (req, res) => {
    try {
      const body = planBodySchema.parse(req.body);
      if (body.plan == null) {
        res.json({ plan: putPlan(deps.db, res.locals.auth.user.id, null) });
        return;
      }
      if (body.plan.kind === 'demo') {
        res.status(400).json({ error: 'Demo week cannot be stored as athlete plan state.' });
        return;
      }
      const parsedPlan = parseStoredWeekPlan(body.plan);
      if (!parsedPlan) {
        res.status(400).json({ error: 'Invalid week plan.' });
        return;
      }
      const plan = putPlan(deps.db, res.locals.auth.user.id, parsedPlan);
      res.json({ plan });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: formatZodError(error) });
        return;
      }
      throw error;
    }
  });

  return router;
}
