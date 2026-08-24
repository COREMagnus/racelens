import { isProduction } from './env';

export const PRODUCTION_AI_DISABLED_MESSAGE =
  'Authenticated AI access is not configured. Session analyze and coach are disabled in production until user authentication is available.';

/**
 * Paid AI routes stay available for local/dev/test only.
 * Production is hard-disabled until real authenticated-user middleware exists.
 * There is no shared-secret bypass.
 */
export function isUnauthenticatedAiAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return !isProduction(env);
}
