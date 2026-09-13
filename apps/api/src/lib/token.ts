import { createHash, randomBytes } from 'node:crypto';

export const DEFAULT_SESSION_DAYS = 30;

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionExpiryIso(now = new Date(), days = DEFAULT_SESSION_DAYS): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function sessionDays(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.AUTH_SESSION_DAYS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_SESSION_DAYS;
}
