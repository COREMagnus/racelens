import type { CoachChatRequest, CoachMessage, Session, WeekPlan } from '@racelens/shared';
import { Router } from 'express';

import { coachReply, httpStatusForAiError } from '../ai';
import { sampleWeekPlan } from '../mocks/plan';

export const coachRouter = Router();

coachRouter.post('/chat', async (req, res) => {
  const body = req.body as Partial<CoachChatRequest>;
  if (!isAthlete(body.athlete) || !Array.isArray(body.messages)) {
    res.status(400).json({
      error: 'Expected { messages: CoachMessage[], athlete: AthleteContext }',
    });
    return;
  }

  const messages = body.messages.filter(isCoachMessage);
  const recentSessions = Array.isArray(body.recentSessions)
    ? body.recentSessions.filter(isSession)
    : undefined;
  const weekPlan = isWeekPlan(body.weekPlan) ? body.weekPlan : sampleWeekPlan();

  try {
    const reply = await coachReply({
      messages,
      athlete: body.athlete,
      ...(recentSessions ? { recentSessions } : {}),
      weekPlan,
    });
    res.json({ reply });
  } catch (error) {
    const { status, error: message } = httpStatusForAiError(error);
    res.status(status).json({ error: message });
  }
});

function isAthlete(value: unknown): value is CoachChatRequest['athlete'] {
  if (value === null || typeof value !== 'object') return false;
  const athlete = value as Record<string, unknown>;
  return (
    typeof athlete.name === 'string' &&
    typeof athlete.raceGoalDate === 'string' &&
    typeof athlete.raceDistance === 'string'
  );
}

function isCoachMessage(value: unknown): value is CoachMessage {
  if (value === null || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === 'string' &&
    (message.role === 'athlete' || message.role === 'coach') &&
    typeof message.content === 'string' &&
    typeof message.createdAt === 'string'
  );
}

function isSession(value: unknown): value is Session {
  if (value === null || typeof value !== 'object') return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.id === 'string' &&
    typeof session.sport === 'string' &&
    typeof session.startedAt === 'string' &&
    typeof session.durationMin === 'number' &&
    typeof session.intensity === 'string' &&
    typeof session.load === 'number' &&
    typeof session.rpe === 'number' &&
    typeof session.notes === 'string' &&
    typeof session.source === 'string'
  );
}

function isWeekPlan(value: unknown): value is WeekPlan {
  if (value === null || typeof value !== 'object') return false;
  const plan = value as Record<string, unknown>;
  return (
    typeof plan.weekStart === 'string' &&
    typeof plan.theme === 'string' &&
    Array.isArray(plan.sessions)
  );
}
