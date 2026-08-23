/**
 * Real OpenAI wiring for session analyze + coach.
 * Replaces the removed heuristic stubs in mocks/analyze.ts and mocks/coach.ts.
 */
export { analyzeSession } from './analyze';
export { createOpenAiClient, isOpenAiConfigured, requireOpenAiKey } from './client';
export { coachReply } from './coach';
export { httpStatusForAiError } from './errors';
export { resolveModels } from './models';
