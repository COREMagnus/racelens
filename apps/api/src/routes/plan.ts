import { Router } from 'express';

import { sampleWeekPlan } from '../mocks/plan';

export const planRouter = Router();

planRouter.get('/week', (_req, res) => {
  res.json(sampleWeekPlan());
});
