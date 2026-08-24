import { Router } from 'express';

import { isOpenAiConfigured, resolveModels } from '../ai';
import { isUnauthenticatedAiAllowed } from '../lib/access';
import type { AppDeps } from '../types';

export function createHealthRouter(deps: AppDeps): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const configured = isOpenAiConfigured(deps.env);
    const models = resolveModels(deps.env);
    const aiAllowed = isUnauthenticatedAiAllowed(deps.env);
    res.json({
      ok: true,
      service: 'trisight-api',
      ai: !aiAllowed ? 'disabled-production' : configured ? 'openai' : 'unconfigured',
      models: configured && aiAllowed
        ? { text: models.text, vision: models.vision, transcribe: models.transcribe }
        : null,
    });
  });

  return router;
}
