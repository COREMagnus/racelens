import type { AiClient } from './ai/client';
import type { AppDatabase } from './db/client';

export interface AppDeps {
  env: NodeJS.ProcessEnv;
  db: AppDatabase;
  aiClient?: AiClient;
}
