import type { CoachChatRequest, CoachMessage, Session, WeekPlan } from '@racelens/shared';

import { createId } from '../lib/id';
import { createOpenAiClient, type AiClient, type ChatMessage } from './client';
import { resolveModels } from './models';
import { buildCoachSystemPrompt, toOpenAiRole } from './prompts';

const MAX_HISTORY = 20;

export async function coachReply(
  request: CoachChatRequest,
  options: {
    client?: AiClient;
    now?: Date;
    id?: string;
    recentSessions?: Session[];
    weekPlan?: WeekPlan;
  } = {},
): Promise<CoachMessage> {
  const client = options.client ?? createOpenAiClient();
  const models = resolveModels();
  const history = request.messages.filter(hasContent).slice(-MAX_HISTORY);

  const recentSessions = options.recentSessions ?? request.recentSessions;
  const weekPlan = options.weekPlan ?? request.weekPlan;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildCoachSystemPrompt(request.athlete, {
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

function hasContent(message: CoachMessage): boolean {
  return message.content.trim().length > 0;
}
