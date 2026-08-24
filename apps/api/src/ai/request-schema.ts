import {
  INTENSITY_FEELS,
  INTENSITY_ZONES,
  RACE_DISTANCES,
  SPORTS,
} from '@racelens/shared';
import { z } from 'zod';

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

const weekdayValues = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const analyzeRequestSchema = z.object({
  type: z.enum(['photo', 'voice', 'text']),
  payload: z.string().min(1),
});

export const athleteContextSchema = z.object({
  name: z.string().min(1),
  raceGoalDate: z.string().min(1),
  raceDistance: z.enum(raceValues),
  readinessScore: z.number().min(0).max(100).optional(),
});

export const coachMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['athlete', 'coach']),
  content: z.string(),
  createdAt: z.string().min(1),
});

export const sessionSchema = z.object({
  id: z.string().min(1),
  sport: z.enum(sportValues),
  startedAt: z.string().min(1),
  durationMin: z.number(),
  intensity: z.enum(intensityValues),
  load: z.number(),
  rpe: z.number(),
  notes: z.string(),
  source: z.enum(['photo', 'voice', 'text', 'manual']),
});

export const plannedSessionSchema = z.object({
  id: z.string().min(1),
  weekday: z.enum(weekdayValues),
  date: z.string().min(1),
  sport: z.enum(sportValues),
  title: z.string().min(1),
  durationMin: z.number(),
  intensity: z.enum(intensityValues),
  focus: z.string(),
  adaptiveNote: z.string().optional(),
});

export const weekPlanSchema = z.object({
  weekStart: z.string().min(1),
  theme: z.string().min(1),
  readinessScore: z.number(),
  readinessNote: z.string(),
  sessions: z.array(plannedSessionSchema),
});

export const coachChatRequestSchema = z.object({
  messages: z.array(coachMessageSchema),
  athlete: athleteContextSchema,
  recentSessions: z.array(sessionSchema).optional(),
  weekPlan: weekPlanSchema.optional(),
});

export type ParsedAnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type ParsedCoachChatRequest = z.infer<typeof coachChatRequestSchema>;

export function formatZodError(error: z.ZodError): string {
  const detail = error.issues
    .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join('; ');
  return `Invalid request (${detail})`;
}
