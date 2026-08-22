import type { CoachChatRequest, CoachMessage } from '@racelens/shared';

import { createId } from '../lib/id';

/**
 * TODO(ai): Replace this canned coach with an LLM call using athlete context,
 * recent sessions, and the weekly plan. OPENAI_API_KEY is reserved for that.
 */
export function coachReplyMock(request: CoachChatRequest): CoachMessage {
  const lastAthlete = [...request.messages]
    .reverse()
    .find((message) => message.role === 'athlete');
  const question = lastAthlete?.content.trim() ?? '';
  const { name, raceDistance, raceGoalDate, readinessScore } = request.athlete;
  const daysOut = daysUntil(raceGoalDate);
  const readiness =
    typeof readinessScore === 'number' ? readinessScore : 72;

  let content: string;
  if (!question) {
    content = `Hey ${name || 'athlete'} — I'm your RaceLens self-coach. You're building toward ${raceDistance} in ${daysOut} days. Readiness is sitting around ${readiness}. What's on your mind?`;
  } else if (/\b(tired|sore|fatigue|sleep)\b/i.test(question)) {
    content = `${name || 'Athlete'}, that sounds like a recover-first day. Keep today's work aerobic, protect sleep, and we'll re-check readiness tomorrow. ${raceDistance} is ${daysOut} days out — better to arrive fresh than force a key session now.`;
  } else if (/\b(brick|bike.*run|run off)\b/i.test(question)) {
    content = `For ${raceDistance} bricks, keep the ride steady (Z2–Z3) and the run short and controlled off the bike. Don't chase pace — practice nutrition and cadence. We can build duration as race day (${daysOut} days) gets closer.`;
  } else if (/\b(plan|week|what should)\b/i.test(question)) {
    content = `This week stays adaptive around a ${readiness} readiness score: one quality session per sport, easy aerobic fillers, and a full rest or technique swim if fatigue stacks up. Tell me how yesterday felt and I'll shuffle the week.`;
  } else {
    content = `Got it. For a ${raceDistance} athlete ${daysOut} days out, I'd bias toward consistency over hero workouts. Hold intensity where the plan says, and log how it felt so I can adapt the week. Want me to look at swim, bike, or run first?`;
  }

  return {
    id: createId('msg'),
    role: 'coach',
    content,
    createdAt: new Date().toISOString(),
  };
}

function daysUntil(isoDate: string): number {
  const target = Date.parse(isoDate);
  if (Number.isNaN(target)) return 90;
  return Math.max(0, Math.ceil((target - Date.now()) / 86_400_000));
}
