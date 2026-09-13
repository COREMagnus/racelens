const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_EMAIL_CHARS = 254;
export const MIN_PASSWORD_CHARS = 8;
export const MAX_PASSWORD_CHARS = 128;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return value.length > 0 && value.length <= MAX_EMAIL_CHARS && EMAIL_RE.test(value);
}
