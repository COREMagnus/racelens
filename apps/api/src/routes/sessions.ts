import type { AnalyzeSessionRequest, CaptureType } from '@racelens/shared';
import { Router } from 'express';

import { analyzeSessionMock } from '../mocks/analyze';

const CAPTURE_TYPES: readonly CaptureType[] = ['photo', 'voice', 'text'];

export const sessionsRouter = Router();

sessionsRouter.post('/analyze', (req, res) => {
  const body = req.body as Partial<AnalyzeSessionRequest>;
  if (!isCaptureType(body.type) || typeof body.payload !== 'string') {
    res.status(400).json({
      error: 'Expected { type: "photo" | "voice" | "text", payload: string }',
    });
    return;
  }

  res.json(analyzeSessionMock({ type: body.type, payload: body.payload }));
});

function isCaptureType(value: unknown): value is CaptureType {
  return (
    typeof value === 'string' &&
    (CAPTURE_TYPES as readonly string[]).includes(value)
  );
}
