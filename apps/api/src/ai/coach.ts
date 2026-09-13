import type { CoachChatRequest, CoachMessage, Session, WeekPlan } from '@racelens/shared';

import { resolveLimits } from '../lib/env';
import { createId } from '../lib/id';
import { createOpenAiClient, type AiClient, type ChatMessage } from './client';
import { resolveModels } from './models';
import { buildCoachSystemPrompt, toOpenAiRole } from './prompts';
import { assertCoachContext } from './request-schema';

export async function coachReply(
  request: CoachChatRequest,
  options: {
    client?: AiClient;
    now?: Date;
    id?: string;
    recentSessions?: Session[];
    weekPlan?: WeekPlan;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<CoachMessage> {
  const env = options.env ?? process.env;
  const limits = resolveLimits(env);
  assertCoachContext(request, limits);
  const client = options.client ?? createOpenAiClient({ env });
  const models = resolveModels(env);
  const history = request.messages.filter(hasContent);

  const recentSessions = providedSessions(options.recentSessions ?? request.recentSessions);
  const weekPlan = options.weekPlan ?? request.weekPlan;
  const athlete = providedAthlete(request.athlete);

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildCoachSystemPrompt(athlete, {
        ...(recentSessions ? { recentSessions } : {}),
        ...(weekPlan ? { weekPlan } : {}),
        ...(options.now ? { now: options.now } : {}),
      }),
    },
    ...history.map((message) => ({
      role: toOpenAiRole(message.role),
      content: message.content,
    })),
  ];

  if (history.every((message) => message.role !== 'athlete')) {
    messages.push({
      role: 'user',
      content: 'The athlete just opened the coach. Greet them briefly and ask what they need.',
    });
  }

  const content = await client.completeCoach({ messages, model: models.text });
  return {
    id: options.id ?? createId('msg'),
    role: 'coach',
    content,
    createdAt: (options.now ?? new Date()).toISOString(),
  };
}

function providedSessions(sessions: Session[] | undefined): Session[] | undefined {
  if (!sessions || sessions.length === 0) return undefined;
  return sessions;
}

function providedAthlete(athlete: CoachChatRequest['athlete']): CoachChatRequest['athlete'] {
  const next: CoachChatRequest['athlete'] = { name: athlete.name };
  if (athlete.raceGoalDate) next.raceGoalDate = athlete.raceGoalDate;
  if (athlete.raceDistance) next.raceDistance = athlete.raceDistance;
  if (typeof athlete.readinessScore === 'number') next.readinessScore = athlete.readinessScore;
  if (typeof athlete.weeklyVolumeHours === 'number') next.weeklyVolumeHours = athlete.weeklyVolumeHours;
  if (athlete.experienceLevel) next.experienceLevel = athlete.experienceLevel;
  if (athlete.constraints) next.constraints = athlete.constraints;
  return next;
}

function hasContent(message: CoachMessage): boolean {
  return message.content.trim().length > 0;
}

