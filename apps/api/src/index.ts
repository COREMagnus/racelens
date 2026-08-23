import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { coachRouter } from './routes/coach';
import { healthRouter } from './routes/health';
import { planRouter } from './routes/plan';
import { sessionsRouter } from './routes/sessions';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: '8mb' }));

app.use('/health', healthRouter);
app.use('/sessions', sessionsRouter);
app.use('/coach', coachRouter);
app.use('/plan', planRouter);

app.listen(port, () => {
  console.log(`RaceLens API listening on http://localhost:${port}`);
});
