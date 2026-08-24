import type { AiClient } from './ai/client';

export interface AppDeps {
  env: NodeJS.ProcessEnv;
  aiClient?: AiClient;
}
