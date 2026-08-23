import type {
  AthleteContext,
  CaptureType,
  CoachMessage,
  Session,
  WeekPlan,
} from '@racelens/shared';

export const ANALYZE_SYSTEM_PROMPT = `You are RaceLens session extraction. Turn an athlete's training capture into one structured triathlon session.

Rules:
- sport must be swim, bike, run, brick, or other.
- intensity must be one of z1, z2, z3, z4, z5, easy, mod, hard. Prefer a zone when the capture mentions Z1–Z5; otherwise use easy/mod/hard.
- durationMin is total minutes for the session (brick = bike + run combined).
- rpe is 1–10. Infer from intensity if not stated (easy/z1≈3, z2≈4, mod/z3≈6, z4≈7, hard/z5≈8).
- load is training load (duration × intensity). If unsure, set load to null and the API will estimate it.
- notes: short athlete-facing summary of what you saw or heard. No markdown.
- startedAt: ISO-8601 if a real date/time is present, otherwise null.
- If the capture is a watch screenshot, whiteboard, or workout card, read the visible numbers (time, distance, HR, power, pace, sport).
- If details are missing, make a conservative estimate and say so in notes. Do not invent a different sport than the capture implies.
- Reply with the structured session only.`;

export const COACH_SYSTEM_PROMPT = `You are RaceLens, a concise triathlon self-coach for age-group athletes.

Style:
- Short, specific, actionable. Typically 3–8 sentences.
- Use triathlon language: Z1–Z5, RPE, bricks, CSS, FTP, long run, open water, fueling, taper.
- No fluff, no medical diagnoses, no supplements or drug advice.

Coaching:
- Respect the athlete's race goal, distance, and days until race day when present.
- If readiness is low, or they report fatigue, soreness, or poor sleep, protect the key session and bias aerobic / recovery over intensity.
- When a week plan or recent sessions are provided, ground advice in that data. Do not invent a conflicting plan.
- One quality session per sport per week is enough for most age-groupers; consistency beats hero workouts.
- Give a clear next action (what to do today or in the next session).`;

export function analyzeUserPrompt(type: CaptureType, text: string): string {
  const trimmed = text.trim();
  if (type === 'photo') {
    return trimmed
      ? `Extract the structured session from this training photo. Additional context from the athlete:\n${trimmed}`
      : 'Extract the structured session from this training photo (watch screen, whiteboard, or workout card).';
  }
  if (type === 'voice') {
    return `Extract the structured session from this voice-note transcript:\n${trimmed}`;
  }
  return `Extract the structured session from this workout description:\n${trimmed}`;
}

export function daysUntil(isoDate: string, now = new Date()): number {
  const target = Date.parse(isoDate);
  if (Number.isNaN(target)) return 90;
  return Math.max(0, Math.ceil((target - now.getTime()) / 86_400_000));
}

export function buildCoachSystemPrompt(
  athlete: AthleteContext,
  extras: {
    recentSessions?: Session[];
    weekPlan?: WeekPlan;
    now?: Date;
  } = {},
): string {
  const now = extras.now ?? new Date();
  const readiness =
    typeof athlete.readinessScore === 'number' ? String(athlete.readinessScore) : 'unknown';
  const lines = [
    COACH_SYSTEM_PROMPT,
    '',
    'Athlete context:',
    `- Name: ${athlete.name || 'athlete'}`,
    `- Race: ${athlete.raceDistance} on ${athlete.raceGoalDate} (${daysUntil(athlete.raceGoalDate, now)} days out)`,
    `- Readiness: ${readiness}`,
  ];

  if (extras.weekPlan) {
    lines.push('', `Week plan (${extras.weekPlan.weekStart}, theme: ${extras.weekPlan.theme}):`);
    lines.push(`Readiness note: ${extras.weekPlan.readinessNote}`);
    for (const session of extras.weekPlan.sessions) {
      lines.push(
        `- ${session.weekday} ${session.sport} ${session.durationMin}min ${session.intensity}: ${session.title} — ${session.focus}`,
      );
    }
  }

  if (extras.recentSessions && extras.recentSessions.length > 0) {
    lines.push('', 'Recent sessions:');
    for (const session of extras.recentSessions.slice(0, 14)) {
      lines.push(
        `- ${session.startedAt.slice(0, 10)} ${session.sport} ${session.durationMin}min ${session.intensity} RPE ${session.rpe} load ${session.load}${session.notes ? ` — ${session.notes}` : ''}`,
      );
    }
  }

  return lines.join('\n');
}

export function toOpenAiRole(role: CoachMessage['role']): 'user' | 'assistant' {
  return role === 'athlete' ? 'user' : 'assistant';
}
