import {
  EXPERIENCE_LEVELS,
  INTENSITY_FEELS,
  INTENSITY_ZONES,
  RACE_DISTANCES,
  SPORTS,
} from '@racelens/shared';
import { z } from 'zod';

import { resolveLimits, type AiLimits } from '../lib/env';
import { AiRequestError } from './errors';

const intensityValues = [...INTENSITY_ZONES, ...INTENSITY_FEELS] as [
  (typeof INTENSITY_ZONES)[number] | (typeof INTENSITY_FEELS)[number],
  ...((typeof INTENSITY_ZONES)[number] | (typeof INTENSITY_FEELS)[number])[],
];

const sportValues = [...SPORTS] as [
  (typeof SPORTS)[number],
  ...(typeof SPORTS)[number][],
];

const raceValues = [...RACE_DISTANCES] as [
  (typeof RACE_DISTANCES)[number],
  ...(typeof RACE_DISTANCES)[number][],
];

const experienceValues = [...EXPERIENCE_LEVELS] as [
  (typeof EXPERIENCE_LEVELS)[number],
  ...(typeof EXPERIENCE_LEVELS)[number][],
];

const weekdayValues = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export function createAnalyzeRequestSchema(limits: AiLimits) {
  return z.object({
    type: z.enum(['photo', 'voice', 'text']),
    payload: z.string().min(1).max(limits.maxPayloadChars),
  });
}

export function createCoachChatRequestSchema(limits: AiLimits) {
  const id = z.string().min(1).max(limits.maxIdChars);
  const date = z.string().min(1).max(limits.maxDateChars);

  const athleteContextSchema = z.object({
    name: z.string().min(1).max(limits.maxNameChars),
    raceGoalDate: date.optional(),
    raceDistance: z.enum(raceValues).optional(),
    readinessScore: z.number().min(0).max(100).optional(),
    weeklyVolumeHours: z.number().min(0).max(168).optional(),
    experienceLevel: z.enum(experienceValues).optional(),
    constraints: z.string().max(limits.maxNoteFieldChars).optional(),
  });

  const coachMessageSchema = z.object({
    id,
    role: z.enum(['athlete', 'coach']),
    content: z.string().max(limits.maxCoachMessageChars),
    createdAt: date,
  });

  const sessionSchema = z.object({
    id,
    sport: z.enum(sportValues),
    startedAt: date,
    durationMin: z.number(),
    intensity: z.enum(intensityValues),
    load: z.number(),
    rpe: z.number(),
    notes: z.string().max(limits.maxSessionNotesChars),
    source: z.enum(['photo', 'voice', 'text', 'manual']),
  });

  const plannedSessionSchema = z.object({
    id,
    weekday: z.enum(weekdayValues),
    date,
    sport: z.enum(sportValues),
    title: z.string().min(1).max(limits.maxTitleChars),
    durationMin: z.number(),
    intensity: z.enum(intensityValues),
    focus: z.string().max(limits.maxFocusChars),
    adaptiveNote: z.string().max(limits.maxNoteFieldChars).optional(),
  });

  const weekPlanSchema = z.object({
    weekStart: date,
    theme: z.string().min(1).max(limits.maxThemeChars),
    readinessScore: z.number().min(0).max(100).optional(),
    readinessNote: z.string().max(limits.maxNoteFieldChars),
    sessions: z.array(plannedSessionSchema).max(limits.maxWeekPlanSessions),
    kind: z.enum(['demo', 'starter']).optional(),
  });

  return z.object({
    messages: z.array(coachMessageSchema).max(limits.maxCoachMessages),
    athlete: athleteContextSchema,
    recentSessions: z.array(sessionSchema).max(limits.maxRecentSessions).optional(),
    weekPlan: weekPlanSchema.optional(),
  });
}

const defaultLimits = resolveLimits({});
export const analyzeRequestSchema = createAnalyzeRequestSchema(defaultLimits);
export const coachChatRequestSchema = createCoachChatRequestSchema(defaultLimits);

export type ParsedAnalyzeRequest = z.infer<ReturnType<typeof createAnalyzeRequestSchema>>;
export type ParsedCoachChatRequest = z.infer<ReturnType<typeof createCoachChatRequestSchema>>;

export function formatZodError(error: z.ZodError): string {
  const detail = error.issues
    .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join('; ');
  return `Invalid request (${detail})`;
}

export function assertAnalyzeText(text: string, maxChars: number): void {
  if (text.length > maxChars) {
    throw new AiRequestError(`Analyze text exceeds the ${maxChars} character limit.`);
  }
}

export function textualCharCount(value: unknown): number {
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + textualCharCount(item), 0);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).reduce((sum, item) => sum + textualCharCount(item), 0);
  }
  return 0;
}

export function coachContextCharCount(request: unknown): number {
  return textualCharCount(request);
}

export function assertCoachContext(request: unknown, limits: AiLimits): void {
  const total = coachContextCharCount(request);
  if (total > limits.maxCoachContextChars) {
    throw new AiRequestError(
      `Coach textual context exceeds the ${limits.maxCoachContextChars} character limit.`,
    );
  }
}
