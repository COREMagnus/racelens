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

export function resolveLimits(env: NodeJS.ProcessEnv = process.env): {
  jsonBodyLimit: string;
  maxPayloadChars: number;
  maxMediaBytes: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
} {
  return {
    jsonBodyLimit: env.AI_JSON_BODY_LIMIT?.trim() || DEFAULT_JSON_BODY_LIMIT,
    maxPayloadChars: positiveInt(env.AI_MAX_PAYLOAD_CHARS, DEFAULT_MAX_PAYLOAD_CHARS),
    maxMediaBytes: positiveInt(env.AI_MAX_MEDIA_BYTES, DEFAULT_MAX_MEDIA_BYTES),
    rateLimitWindowMs: positiveInt(env.AI_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS),
    rateLimitMax: nonNegativeInt(env.AI_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX),
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
