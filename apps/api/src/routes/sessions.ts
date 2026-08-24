import { Router } from 'express';
import { ZodError } from 'zod';

import { analyzeSession, httpStatusForAiError } from '../ai';
import { createAnalyzeRequestSchema, formatZodError } from '../ai/request-schema';
import { resolveLimits } from '../lib/env';
import type { AppDeps } from '../types';

export function createSessionsRouter(deps: AppDeps): Router {
  const router = Router();
  const limits = resolveLimits(deps.env);
  const schema = createAnalyzeRequestSchema(limits);

  router.post('/analyze', async (req, res) => {
    try {
      const body = schema.parse(req.body);
      const session = await analyzeSession(
        { type: body.type, payload: body.payload },
        {
          env: deps.env,
          ...(deps.aiClient ? { client: deps.aiClient } : {}),
        },
      );
      res.json(session);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: formatZodError(error) });
        return;
      }
      const { status, error: message } = httpStatusForAiError(error);
      res.status(status).json({ error: message });
    }
  });

  return router;
}
