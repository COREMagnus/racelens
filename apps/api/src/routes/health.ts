import { Router } from 'express';

import { isOpenAiConfigured, resolveModels } from '../ai';
import { aiAccessMode } from '../lib/access';
import type { AppDeps } from '../types';

export function createHealthRouter(deps: AppDeps): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const configured = isOpenAiConfigured(deps.env);
    const models = resolveModels(deps.env);
    res.json({
      ok: true,
      service: 'triadapt-api',
      ai: configured ? 'openai' : 'unconfigured',
      aiAccess: aiAccessMode(deps.env),
      auth: 'email-password',
      database: 'sqlite',
      models: configured
        ? { text: models.text, vision: models.vision, transcribe: models.transcribe }
        : null,
    });
  });

  return router;
}
