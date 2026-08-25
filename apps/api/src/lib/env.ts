export function isProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.NODE_ENV ?? '').toLowerCase() === 'production';
}

export function parseCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export const DEFAULT_JSON_BODY_LIMIT = '8mb';
export const DEFAULT_MAX_PAYLOAD_CHARS = 6_000_000;
export const DEFAULT_MAX_MEDIA_BYTES = 4 * 1024 * 1024;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX = 30;

export const DEFAULT_MAX_ANALYZE_TEXT_CHARS = 20_000;
export const DEFAULT_MAX_COACH_MESSAGES = 30;
export const DEFAULT_MAX_COACH_MESSAGE_CHARS = 8_000;
export const DEFAULT_MAX_COACH_CONTEXT_CHARS = 100_000;
export const DEFAULT_MAX_RECENT_SESSIONS = 50;
export const DEFAULT_MAX_WEEK_PLAN_SESSIONS = 21;
export const DEFAULT_MAX_SESSION_NOTES_CHARS = 4_000;

export const DEFAULT_MAX_ID_CHARS = 128;
export const DEFAULT_MAX_NAME_CHARS = 120;
export const DEFAULT_MAX_DATE_CHARS = 64;
export const DEFAULT_MAX_TITLE_CHARS = 200;
export const DEFAULT_MAX_THEME_CHARS = 300;
export const DEFAULT_MAX_FOCUS_CHARS = 500;
export const DEFAULT_MAX_NOTE_FIELD_CHARS = 500;

export interface AiLimits {
  jsonBodyLimit: string;
  maxPayloadChars: number;
  maxMediaBytes: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  maxAnalyzeTextChars: number;
  maxCoachMessages: number;
  maxCoachMessageChars: number;
  maxCoachContextChars: number;
  maxRecentSessions: number;
  maxWeekPlanSessions: number;
  maxSessionNotesChars: number;
  maxIdChars: number;
  maxNameChars: number;
  maxDateChars: number;
  maxTitleChars: number;
  maxThemeChars: number;
  maxFocusChars: number;
  maxNoteFieldChars: number;
}

export function resolveLimits(env: NodeJS.ProcessEnv = process.env): AiLimits {
  return {
    jsonBodyLimit: env.AI_JSON_BODY_LIMIT?.trim() || DEFAULT_JSON_BODY_LIMIT,
    maxPayloadChars: positiveInt(env.AI_MAX_PAYLOAD_CHARS, DEFAULT_MAX_PAYLOAD_CHARS),
    maxMediaBytes: positiveInt(env.AI_MAX_MEDIA_BYTES, DEFAULT_MAX_MEDIA_BYTES),
    rateLimitWindowMs: positiveInt(env.AI_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS),
    rateLimitMax: nonNegativeInt(env.AI_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX),
    maxAnalyzeTextChars: positiveInt(env.AI_MAX_ANALYZE_TEXT_CHARS, DEFAULT_MAX_ANALYZE_TEXT_CHARS),
    maxCoachMessages: positiveInt(env.AI_MAX_COACH_MESSAGES, DEFAULT_MAX_COACH_MESSAGES),
    maxCoachMessageChars: positiveInt(env.AI_MAX_COACH_MESSAGE_CHARS, DEFAULT_MAX_COACH_MESSAGE_CHARS),
    maxCoachContextChars: positiveInt(env.AI_MAX_COACH_CONTEXT_CHARS, DEFAULT_MAX_COACH_CONTEXT_CHARS),
    maxRecentSessions: positiveInt(env.AI_MAX_RECENT_SESSIONS, DEFAULT_MAX_RECENT_SESSIONS),
    maxWeekPlanSessions: positiveInt(env.AI_MAX_WEEK_PLAN_SESSIONS, DEFAULT_MAX_WEEK_PLAN_SESSIONS),
    maxSessionNotesChars: positiveInt(env.AI_MAX_SESSION_NOTES_CHARS, DEFAULT_MAX_SESSION_NOTES_CHARS),
    maxIdChars: DEFAULT_MAX_ID_CHARS,
    maxNameChars: DEFAULT_MAX_NAME_CHARS,
    maxDateChars: DEFAULT_MAX_DATE_CHARS,
    maxTitleChars: DEFAULT_MAX_TITLE_CHARS,
    maxThemeChars: DEFAULT_MAX_THEME_CHARS,
    maxFocusChars: DEFAULT_MAX_FOCUS_CHARS,
    maxNoteFieldChars: DEFAULT_MAX_NOTE_FIELD_CHARS,
  };
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function nonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}
