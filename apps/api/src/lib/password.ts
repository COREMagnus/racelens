import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import { isTest } from './env';

const KEY_LEN = 64;
const DEFAULT_N = 16_384;
const TEST_N = 4;
const R = 8;
const P = 1;

export function hashPassword(password: string, env: NodeJS.ProcessEnv = process.env): string {
  const N = scryptN(env);
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || N < 2 || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }
  try {
    const salt = Buffer.from(parts[4] ?? '', 'hex');
    const expected = Buffer.from(parts[5] ?? '', 'hex');
    if (salt.length === 0 || expected.length === 0) return false;
    const actual = scryptSync(password, salt, expected.length, { N, r, p });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function scryptN(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.AUTH_SCRYPT_N);
  if (Number.isInteger(parsed) && parsed >= 2 && (parsed & (parsed - 1)) === 0) {
    return parsed;
  }
  return isTest(env) ? TEST_N : DEFAULT_N;
}
