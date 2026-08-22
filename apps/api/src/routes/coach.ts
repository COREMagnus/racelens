import type { CoachChatRequest, CoachMessage } from '@racelens/shared';
import { Router } from 'express';

import { coachReplyMock } from '../mocks/coach';

export const coachRouter = Router();

coachRouter.post('/chat', (req, res) => {
  const body = req.body as Partial<CoachChatRequest>;
  if (!isAthlete(body.athlete) || !Array.isArray(body.messages)) {
    res.status(400).json({
      error: 'Expected { messages: CoachMessage[], athlete: AthleteContext }',
    });
    return;
  }

  const messages = body.messages.filter(isCoachMessage);
  res.json({
    reply: coachReplyMock({ messages, athlete: body.athlete }),
  });
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
