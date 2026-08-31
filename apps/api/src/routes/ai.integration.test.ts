import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import { createApp } from '../app';
import type { AiClient } from '../ai/client';
import { AiParseError, AiUpstreamError } from '../ai/errors';
import { PRODUCTION_AI_DISABLED_MESSAGE } from '../lib/access';
import type { SessionExtraction } from '../ai/schema';

const extracted: SessionExtraction = {
  sport: 'bike',
  durationMin: 45,
  intensity: 'easy',
  load: 27,
  rpe: 4,
  notes: 'Easy spin.',
  startedAt: null,
};

function mockClient(overrides: Partial<AiClient> = {}): AiClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async parseSession() {
      calls.push('parseSession');
      return extracted;
    },
    async completeCoach({ messages }) {
      calls.push('completeCoach');
      const system = messages.find((message) => message.role === 'system');
      const text = typeof system?.content === 'string' ? system.content : '';
      return `COACH_PROMPT_START\n${text}\nCOACH_PROMPT_END`;
    },
    async transcribe() {
      calls.push('transcribe');
      return '45 min easy bike';
    },
    ...overrides,
  };
}

const testEnv = {
  NODE_ENV: 'test',
  AI_RATE_LIMIT_MAX: '1000',
};

const athlete = {
  name: 'Alex',
  raceGoalDate: '2026-10-04',
  raceDistance: '70.3',
};

const athleteMessage = {
  id: 'm1',
  role: 'athlete' as const,
  content: 'How should I handle fatigue this week?',
  createdAt: '2026-08-23T12:00:00.000Z',
};

describe('AI HTTP routes', () => {
  it('returns 503 when OPENAI_API_KEY is missing', async () => {
    const app = createApp({ env: { ...testEnv } });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'text', payload: '45 min easy bike' });
    assert.equal(res.status, 503);
    assert.match(res.body.error, /OPENAI_API_KEY/);
    assert.doesNotMatch(JSON.stringify(res.body), /sk-/);
  });

  it('returns 503 in production even when a key and client are present', async () => {
    const client = mockClient();
    const app = createApp({
      env: {
        NODE_ENV: 'production',
        OPENAI_API_KEY: 'sk-should-never-be-sent',
        AI_RATE_LIMIT_MAX: '1000',
      },
      aiClient: client,
    });
    const analyze = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'text', payload: '45 min easy bike' });
    const coach = await request(app)
      .post('/coach/chat')
      .send({ messages: [athleteMessage], athlete });
    assert.equal(analyze.status, 503);
    assert.equal(coach.status, 503);
    assert.equal(analyze.body.error, PRODUCTION_AI_DISABLED_MESSAGE);
    assert.equal(coach.body.error, PRODUCTION_AI_DISABLED_MESSAGE);
    assert.deepEqual(client.calls, []);
    assert.doesNotMatch(JSON.stringify(analyze.body), /sk-should-never-be-sent/);
  });

  it('returns 400 for invalid analyze and coach bodies', async () => {
    const app = createApp({ env: testEnv, aiClient: mockClient() });
    const analyze = await request(app).post('/sessions/analyze').send({ type: 'nope' });
    const coach = await request(app).post('/coach/chat').send({ messages: 'nope' });
    assert.equal(analyze.status, 400);
    assert.equal(coach.status, 400);
  });

  it('rejects remote audio URLs with 400 and does not call OpenAI', async () => {
    const client = mockClient();
    const app = createApp({ env: testEnv, aiClient: client });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'voice', payload: 'https://evil.example/note.mp3' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Remote audio URLs are not allowed/);
    assert.deepEqual(client.calls, []);
  });

  it('rejects malformed audio before calling OpenAI', async () => {
    const client = mockClient();
    const app = createApp({ env: testEnv, aiClient: client });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'voice', payload: 'data:audio/m4a;base64,%%%%' });
    assert.equal(res.status, 400);
    assert.deepEqual(client.calls, []);
  });

  it('rejects oversized media before calling OpenAI', async () => {
    const client = mockClient();
    const app = createApp({
      env: { ...testEnv, AI_MAX_MEDIA_BYTES: '16' },
      aiClient: client,
    });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'voice', payload: `data:audio/m4a;base64,${'A'.repeat(100)}` });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /exceeds/);
    assert.deepEqual(client.calls, []);
  });

  it('maps invalid model output to 422', async () => {
    const app = createApp({
      env: testEnv,
      aiClient: mockClient({
        async parseSession() {
          throw new AiParseError('Could not map the model output onto a Session.');
        },
      }),
    });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'text', payload: 'garbage' });
    assert.equal(res.status, 422);
  });

  it('maps upstream OpenAI failure to 502', async () => {
    const app = createApp({
      env: testEnv,
      aiClient: mockClient({
        async parseSession() {
          throw new AiUpstreamError('Session analysis failed: model unavailable');
        },
      }),
    });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'text', payload: '45 min run' });
    assert.equal(res.status, 502);
  });

  it('returns a Session shape for valid text analyze', async () => {
    const app = createApp({ env: testEnv, aiClient: mockClient() });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'text', payload: '45 min easy bike, RPE 4' });
    assert.equal(res.status, 200);
    assert.equal(res.body.sport, 'bike');
    assert.equal(res.body.durationMin, 45);
    assert.equal(res.body.intensity, 'easy');
    assert.equal(typeof res.body.id, 'string');
    assert.equal(res.body.source, 'text');
    assert.equal(typeof res.body.load, 'number');
    assert.equal(typeof res.body.startedAt, 'string');
  });

  it('does not fabricate readiness or sample-plan content for a normal coach request', async () => {
    const app = createApp({ env: testEnv, aiClient: mockClient() });
    const res = await request(app)
      .post('/coach/chat')
      .send({ messages: [athleteMessage], athlete });
    assert.equal(res.status, 200);
    assert.equal(res.body.reply.role, 'coach');
    const prompt = res.body.reply.content as string;
    assert.doesNotMatch(prompt, /readiness 74/i);
    assert.doesNotMatch(prompt, /Readiness: 74/);
    assert.doesNotMatch(prompt, /Sleep and HRV look stable/);
    assert.doesNotMatch(prompt, /Saturday brick/);
    assert.doesNotMatch(prompt, /Bike-run brick/);
    assert.match(prompt, /Not provided \(treat as unknown/);
  });

  it('passes real goal fields and omits fabricated readiness when the profile is incomplete', async () => {
    const app = createApp({ env: testEnv, aiClient: mockClient() });
    const incomplete = await request(app)
      .post('/coach/chat')
      .send({ messages: [athleteMessage], athlete: { name: 'Sam' } });
    assert.equal(incomplete.status, 200);
    assert.doesNotMatch(incomplete.body.reply.content, /readiness 74/i);
    assert.doesNotMatch(incomplete.body.reply.content, /Bike-run brick/);
    assert.match(incomplete.body.reply.content, /race goal/);

    const withGoal = await request(app)
      .post('/coach/chat')
      .send({
        messages: [athleteMessage],
        athlete: {
          name: 'Sam',
          raceDistance: '70.3',
          raceGoalDate: '2026-11-08',
          weeklyVolumeHours: 8,
          experienceLevel: 'intermediate',
          constraints: 'Sore left knee',
        },
        weekPlan: {
          weekStart: '2026-08-17',
          theme: 'Starter week · 70.3 · 11 weeks out',
          readinessNote: 'Starter week from your race goal and typical weekly volume. Readiness unknown — not from sleep or HRV.',
          kind: 'starter',
          sessions: [
            {
              id: 'starter_saturday_brick',
              weekday: 'saturday',
              date: '2026-08-22',
              sport: 'brick',
              title: 'Bike-run brick',
              durationMin: 90,
              intensity: 'mod',
              focus: 'Mostly bike, then a short off-bike run.',
            },
          ],
        },
      });
    assert.equal(withGoal.status, 200);
    assert.match(withGoal.body.reply.content, /70\.3 on 2026-11-08/);
    assert.match(withGoal.body.reply.content, /Typical weekly volume: 8 hours/);
    assert.match(withGoal.body.reply.content, /Sore left knee/);
    assert.match(withGoal.body.reply.content, /Starter week · 70\.3/);
    assert.doesNotMatch(withGoal.body.reply.content, /Readiness: 74/);
    assert.doesNotMatch(withGoal.body.reply.content, /readiness 74/i);
  });

  it('passes real readiness, sessions, and week plan through to the coach prompt', async () => {
    const app = createApp({ env: testEnv, aiClient: mockClient() });
    const res = await request(app)
      .post('/coach/chat')
      .send({
        messages: [athleteMessage],
        athlete: { ...athlete, readinessScore: 58 },
        recentSessions: [
          {
            id: 'ses_1',
            sport: 'run',
            startedAt: '2026-08-21T10:00:00.000Z',
            durationMin: 40,
            intensity: 'easy',
            load: 24,
            rpe: 3,
            notes: 'Legs heavy',
            source: 'text',
          },
        ],
        weekPlan: {
          weekStart: '2026-08-17',
          theme: 'Build week',
          readinessScore: 58,
          readinessNote: 'Fatigue stacking.',
          sessions: [
            {
              id: 'plan_sat_brick',
              weekday: 'saturday',
              date: '2026-08-22',
              sport: 'brick',
              title: 'Bike-run brick',
              durationMin: 90,
              intensity: 'mod',
              focus: '60 ride + 20 run',
            },
          ],
        },
      });
    assert.equal(res.status, 200);
    assert.match(res.body.reply.content, /Readiness: 58/);
    assert.match(res.body.reply.content, /Bike-run brick/);
    assert.match(res.body.reply.content, /Legs heavy/);
  });

  it('serves health and a clearly labeled demo plan without calling OpenAI', async () => {
    const client = mockClient();
    const app = createApp({ env: testEnv, aiClient: client });
    const health = await request(app).get('/health');
    const plan = await request(app).get('/plan/week');
    assert.equal(health.status, 200);
    assert.equal(health.body.service, 'triadapt-api');
    assert.equal(health.body.ai, 'unconfigured');
    assert.equal(plan.status, 200);
    assert.match(plan.body.theme, /demo/i);
    assert.match(plan.body.readinessNote, /Demo data only/i);
    assert.deepEqual(client.calls, []);
  });

  it('can disable the AI rate limiter with AI_RATE_LIMIT_MAX=0', async () => {
    const app = createApp({
      env: { ...testEnv, AI_RATE_LIMIT_MAX: '0' },
      aiClient: mockClient(),
    });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'text', payload: '20 min easy swim' });
    assert.equal(res.status, 200);
  });

  it('rejects oversized text payloads before OpenAI', async () => {
    const client = mockClient();
    const app = createApp({
      env: { ...testEnv, AI_MAX_PAYLOAD_CHARS: '8' },
      aiClient: client,
    });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'text', payload: 'way too long for the limit' });
    assert.equal(res.status, 400);
    assert.deepEqual(client.calls, []);
  });

  it('greets when coach history has no athlete message', async () => {
    const app = createApp({ env: testEnv, aiClient: mockClient() });
    const res = await request(app)
      .post('/coach/chat')
      .send({
        messages: [
          {
            id: 'welcome',
            role: 'coach',
            content: 'Hello',
            createdAt: '2026-08-23T12:00:00.000Z',
          },
        ],
        athlete,
      });
    assert.equal(res.status, 200);
    assert.equal(res.body.reply.role, 'coach');
  });

  it('accepts TRUST_PROXY for deployments behind a reverse proxy', async () => {
    const app = createApp({
      env: { ...testEnv, TRUST_PROXY: 'true' },
      aiClient: mockClient(),
    });
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(app.get('trust proxy'), 1);
  });

  it('reports health as openai when a local key is configured', async () => {
    const app = createApp({
      env: { ...testEnv, OPENAI_API_KEY: 'sk-local-only' },
      aiClient: mockClient(),
    });
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ai, 'openai');
    assert.equal(res.body.models.text, 'gpt-4.1-mini');
    assert.doesNotMatch(JSON.stringify(res.body), /sk-local-only/);
  });

  it('rejects oversized analyze text with 400 and does not call OpenAI', async () => {
    const client = mockClient();
    const app = createApp({ env: testEnv, aiClient: client });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'text', payload: 'x'.repeat(20_001) });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Analyze text exceeds/);
    assert.deepEqual(client.calls, []);
  });

  it('rejects too many coach messages with 400 and does not call OpenAI', async () => {
    const client = mockClient();
    const app = createApp({ env: testEnv, aiClient: client });
    const res = await request(app)
      .post('/coach/chat')
      .send({
        messages: Array.from({ length: 31 }, (_, index) => ({
          id: `m${index}`,
          role: index % 2 === 0 ? 'athlete' : 'coach',
          content: 'ok',
          createdAt: '2026-08-23T12:00:00.000Z',
        })),
        athlete,
      });
    assert.equal(res.status, 400);
    assert.deepEqual(client.calls, []);
  });

  it('rejects too many recent sessions with 400 and does not call OpenAI', async () => {
    const client = mockClient();
    const app = createApp({ env: testEnv, aiClient: client });
    const res = await request(app)
      .post('/coach/chat')
      .send({
        messages: [athleteMessage],
        athlete,
        recentSessions: Array.from({ length: 51 }, (_, index) => ({
          id: `ses_${index}`,
          sport: 'run',
          startedAt: '2026-08-21T10:00:00.000Z',
          durationMin: 40,
          intensity: 'easy',
          load: 24,
          rpe: 3,
          notes: 'ok',
          source: 'text',
        })),
      });
    assert.equal(res.status, 400);
    assert.deepEqual(client.calls, []);
  });

  it('rejects too many planned sessions with 400 and does not call OpenAI', async () => {
    const client = mockClient();
    const app = createApp({ env: testEnv, aiClient: client });
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const res = await request(app)
      .post('/coach/chat')
      .send({
        messages: [athleteMessage],
        athlete,
        weekPlan: {
          weekStart: '2026-08-17',
          theme: 'Build week',
          readinessScore: 70,
          readinessNote: 'Fine',
          sessions: Array.from({ length: 22 }, (_, index) => ({
            id: `plan_${index}`,
            weekday: weekdays[index % 7],
            date: '2026-08-17',
            sport: 'run',
            title: 'Easy',
            durationMin: 30,
            intensity: 'easy',
            focus: 'aerobic',
          })),
        },
      });
    assert.equal(res.status, 400);
    assert.deepEqual(client.calls, []);
  });

  it('rejects oversized coach aggregate context with 400 and does not call OpenAI', async () => {
    const client = mockClient();
    const app = createApp({
      env: { ...testEnv, AI_MAX_COACH_CONTEXT_CHARS: '40' },
      aiClient: client,
    });
    const res = await request(app)
      .post('/coach/chat')
      .send({
        messages: [athleteMessage],
        athlete,
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Coach textual context exceeds/);
    assert.deepEqual(client.calls, []);
  });

  it('rejects an oversized photo hint with 400 and does not call OpenAI', async () => {
    const client = mockClient();
    const app = createApp({ env: testEnv, aiClient: client });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({
        type: 'photo',
        payload: `https://cdn.example.com/watch.png — ${'h'.repeat(20_001)}`,
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Analyze text exceeds/);
    assert.deepEqual(client.calls, []);
  });

  it('still analyzes a valid photo data URI under the media limits', async () => {
    const client = mockClient();
    const app = createApp({ env: testEnv, aiClient: client });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'photo', payload: 'data:image/jpeg;base64,/9j/4AAQ' });
    assert.equal(res.status, 200);
    assert.equal(res.body.source, 'photo');
    assert.deepEqual(client.calls, ['parseSession']);
  });

  it('rejects an oversized extracted voice transcript after Whisper and does not structure', async () => {
    let transcribed = false;
    const client = mockClient({
      async transcribe() {
        transcribed = true;
        return 't'.repeat(20_001);
      },
    });
    const app = createApp({ env: testEnv, aiClient: client });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'voice', payload: 'data:audio/m4a;base64,AAAA' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Analyze text exceeds/);
    assert.equal(transcribed, true);
    assert.deepEqual(client.calls, []);
  });

  it('rejects an oversized coach message with 400 and does not call OpenAI', async () => {
    const client = mockClient();
    const app = createApp({ env: testEnv, aiClient: client });
    const res = await request(app)
      .post('/coach/chat')
      .send({
        messages: [{ ...athleteMessage, content: 'c'.repeat(8_001) }],
        athlete,
      });
    assert.equal(res.status, 400);
    assert.deepEqual(client.calls, []);
  });

  it('still analyzes a valid audio data URI under the media limits', async () => {
    const client = mockClient();
    const app = createApp({ env: testEnv, aiClient: client });
    const res = await request(app)
      .post('/sessions/analyze')
      .send({ type: 'voice', payload: 'data:audio/m4a;base64,AAAA' });
    assert.equal(res.status, 200);
    assert.equal(res.body.source, 'voice');
    assert.ok(client.calls.includes('transcribe'));
    assert.ok(client.calls.includes('parseSession'));
  });

  it('rejects disallowed browser origins', async () => {
    const app = createApp({
      env: { ...testEnv, NODE_ENV: 'production', CORS_ORIGINS: 'https://app.triadapt.example' },
      aiClient: mockClient(),
    });
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example');
    assert.equal(res.status, 403);
  });
});
