import { isProduction } from './env';

export const AUTH_REQUIRED_AI_MESSAGE = 'Sign in required to use session analyze and coach.';

/**
 * Paid AI routes stay available without a session for local/dev/test.
 * Production requires a real authenticated user. There is no shared-secret bypass.
 */
export function isUnauthenticatedAiAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return !isProduction(env);
}

export function isAiRouteAllowed(
  env: NodeJS.ProcessEnv = process.env,
  authenticated = false,
): boolean {
  return isUnauthenticatedAiAllowed(env) || authenticated;
}

export function aiAccessMode(env: NodeJS.ProcessEnv = process.env): 'local' | 'authenticated' {
  return isProduction(env) ? 'authenticated' : 'local';
}
