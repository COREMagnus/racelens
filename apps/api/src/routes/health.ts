import { Router } from 'express';

import { isOpenAiConfigured, resolveModels } from '../ai';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const configured = isOpenAiConfigured();
  const models = resolveModels();
  res.json({
    ok: true,
    service: 'racelens-api',
    ai: configured ? 'openai' : 'unconfigured',
    models: configured
      ? { text: models.text, vision: models.vision, transcribe: models.transcribe }
      : null,
  });
});
