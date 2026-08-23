import type { AnalyzeSessionRequest, CaptureType } from '@racelens/shared';
import { Router } from 'express';

import { analyzeSession, httpStatusForAiError } from '../ai';

const CAPTURE_TYPES: readonly CaptureType[] = ['photo', 'voice', 'text'];

export const sessionsRouter = Router();

sessionsRouter.post('/analyze', async (req, res) => {
  const body = req.body as Partial<AnalyzeSessionRequest>;
  if (!isCaptureType(body.type) || typeof body.payload !== 'string') {
    res.status(400).json({
      error: 'Expected { type: "photo" | "voice" | "text", payload: string }',
    });
    return;
  }

  try {
    const session = await analyzeSession({ type: body.type, payload: body.payload });
    res.json(session);
  } catch (error) {
    const { status, error: message } = httpStatusForAiError(error);
    res.status(status).json({ error: message });
  }
});

function isCaptureType(value: unknown): value is CaptureType {
  return (
    typeof value === 'string' &&
    (CAPTURE_TYPES as readonly string[]).includes(value)
  );
}
