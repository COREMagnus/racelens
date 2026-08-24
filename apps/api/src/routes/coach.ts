import type {
  AthleteContext,
  CoachChatRequest,
  CoachMessage,
  PlannedSession,
  Session,
  WeekPlan,
} from '@racelens/shared';
import { Router } from 'express';
import { ZodError } from 'zod';

import { coachReply, httpStatusForAiError } from '../ai';
import {
  assertCoachContext,
  createCoachChatRequestSchema,
  formatZodError,
  type ParsedCoachChatRequest,
} from '../ai/request-schema';
import { resolveLimits } from '../lib/env';
import type { AppDeps } from '../types';

export function createCoachRouter(deps: AppDeps): Router {
  const router = Router();
  const limits = resolveLimits(deps.env);
  const schema = createCoachChatRequestSchema(limits);

  router.post('/chat', async (req, res) => {
    try {
      const parsed = schema.parse(req.body);
      assertCoachContext(parsed, limits);
      const request = toCoachRequest(parsed);
      const reply = await coachReply(request, {
        env: deps.env,
        ...(deps.aiClient ? { client: deps.aiClient } : {}),
      });
      res.json({ reply });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: formatZodError(error) });
        return;
      }
      const { status, error: message } = httpStatusForAiError(error);
      res.status(status).json({ error: message });
    }
  });

  return router;
}

export function toCoachRequest(parsed: ParsedCoachChatRequest): CoachChatRequest {
  const request: CoachChatRequest = {
    messages: parsed.messages.map(toMessage),
    athlete: toAthleteContext(parsed.athlete),
  };
  if (parsed.recentSessions && parsed.recentSessions.length > 0) {
    request.recentSessions = parsed.recentSessions.map(toSession);
  }
  if (parsed.weekPlan) {
    request.weekPlan = toWeekPlan(parsed.weekPlan);
  }
  return request;
}

function toMessage(message: ParsedCoachChatRequest['messages'][number]): CoachMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  };
}

function toAthleteContext(athlete: ParsedCoachChatRequest['athlete']): AthleteContext {
  const next: AthleteContext = {
    name: athlete.name,
    raceGoalDate: athlete.raceGoalDate,
    raceDistance: athlete.raceDistance,
  };
  if (typeof athlete.readinessScore === 'number') {
    next.readinessScore = athlete.readinessScore;
  }
  return next;
}

function toSession(session: NonNullable<ParsedCoachChatRequest['recentSessions']>[number]): Session {
  return {
    id: session.id,
    sport: session.sport,
    startedAt: session.startedAt,
    durationMin: session.durationMin,
    intensity: session.intensity,
    load: session.load,
    rpe: session.rpe,
    notes: session.notes,
    source: session.source,
  };
}

function toWeekPlan(plan: NonNullable<ParsedCoachChatRequest['weekPlan']>): WeekPlan {
  return {
    weekStart: plan.weekStart,
    theme: plan.theme,
    readinessScore: plan.readinessScore,
    readinessNote: plan.readinessNote,
    sessions: plan.sessions.map(toPlannedSession),
  };
}

function toPlannedSession(
  session: NonNullable<ParsedCoachChatRequest['weekPlan']>['sessions'][number],
): PlannedSession {
  const next: PlannedSession = {
    id: session.id,
    weekday: session.weekday,
    date: session.date,
    sport: session.sport,
    title: session.title,
    durationMin: session.durationMin,
    intensity: session.intensity,
    focus: session.focus,
  };
  if (typeof session.adaptiveNote === 'string') {
    next.adaptiveNote = session.adaptiveNote;
  }
  return next;
}
