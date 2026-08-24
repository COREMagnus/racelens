import type { CorsOptions } from 'cors';

import { isProduction, parseCsv } from './env';

const LOCAL_DEV_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|\[::1\])(?::\d+)?$/i;

export function isAllowedOrigin(origin: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!origin) {
    return true;
  }

  const allowlist = parseCsv(env.CORS_ORIGINS);
  if (allowlist.includes(origin)) {
    return true;
  }

  if (!isProduction(env) && allowlist.length === 0 && LOCAL_DEV_ORIGIN.test(origin)) {
    return true;
  }

  return false;
}

export function createCorsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  return {
    origin(origin, callback) {
      if (isAllowedOrigin(origin, env)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed'));
    },
  };
}
