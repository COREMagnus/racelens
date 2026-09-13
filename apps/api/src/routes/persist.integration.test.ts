import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import { generateStarterWeek, normalizeAthleteProfile, sampleWeekPlan } from '@racelens/shared';

import { createApp } from '../app';

const testEnv = {
  NODE_ENV: 'test',
  AI_RATE_LIMIT_MAX: '0',
  AUTH_RATE_LIMIT_MAX: '0',
  DATABASE_PATH: ':memory:',
  AUTH_SCRYPT_N: '4',
};

const profile = normalizeAthleteProfile({
  name: 'Sam',
  raceDistance: 'Olympic',
  raceGoalDate: '2026-09-20',
  weeklyVolume: { totalHours: 7 },
  experienceLevel: 'beginner',
  constraints: 'Travel weeks in October',
});

const session = {
  id: 'ses_1',
  sport: 'run',
  startedAt: '2026-08-21T10:00:00.000Z',
  durationMin: 40,
  intensity: 'easy',
  load: 24,
  rpe: 3,
  notes: 'Legs heavy',
  source: 'text',
};

async function register(app: ReturnType<typeof createApp>, email = 'sam@example.com') {
  const res = await request(app).post('/auth/register').send({ email, password: 'password12' });
  assert.equal(res.status, 201);
  return res.body.token as string;
}

describe('authenticated persistence', () => {
  it('persists profile, confirmed sessions, and starter plan across login', async () => {
    const app = createApp({ env: testEnv });
    const token = await register(app);

    const saved = await request(app).put('/me/profile').set('Authorization', `Bearer ${token}`).send(profile);
    assert.equal(saved.status, 200);
    assert.equal(saved.body.profile.name, 'Sam');
    assert.equal(saved.body.profile.raceDistance, 'Olympic');
    assert.equal(saved.body.plan?.kind, 'starter');
    assert.doesNotMatch(JSON.stringify(saved.body), /readinessScore.:74/);

    const logged = await request(app).post('/me/sessions').set('Authorization', `Bearer ${token}`).send(session);
    assert.equal(logged.status, 201);
    assert.equal(logged.body.id, 'ses_1');

    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'sam@example.com', password: 'password12' });
    assert.equal(login.status, 200);
    assert.equal(login.body.profile.name, 'Sam');
    assert.equal(login.body.sessions[0]?.id, 'ses_1');
    assert.equal(login.body.plan?.kind, 'starter');

    const otherToken = login.body.token as string;
    const me = await request(app).get('/me').set('Authorization', `Bearer ${otherToken}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.profile.weeklyVolume.totalHours, 7);
    assert.equal(me.body.sessions.length, 1);
    assert.equal(me.body.plan.kind, 'starter');
  });

  it('rejects storing a demo week and keeps GET /plan/week as unlabeled demo', async () => {
    const app = createApp({ env: testEnv });
    const token = await register(app, 'demo@example.com');
    const demo = sampleWeekPlan(new Date('2026-08-24T12:00:00.000Z'));
    const rejected = await request(app)
      .put('/me/plan')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: demo });
    assert.equal(rejected.status, 400);
    assert.match(rejected.body.error, /Demo week/);

    const publicPlan = await request(app).get('/plan/week');
    assert.equal(publicPlan.status, 200);
    assert.match(publicPlan.body.theme, /demo/i);

    const stored = await request(app).get('/me/plan').set('Authorization', `Bearer ${token}`);
    assert.equal(stored.status, 200);
    assert.equal(stored.body.plan, null);
  });

  it('lets a signed-in user complete onboarding and reload the same goal', async () => {
    const app = createApp({ env: testEnv });
    const token = await register(app, 'onboard@example.com');
    const empty = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    assert.equal(empty.body.profile, null);

    const saved = await request(app).put('/me/profile').set('Authorization', `Bearer ${token}`).send(profile);
    assert.equal(saved.status, 200);
    const starter = generateStarterWeek(profile, new Date());
    assert.ok(starter);
    assert.equal(saved.body.plan?.kind, 'starter');

    const reload = await request(app).get('/me/profile').set('Authorization', `Bearer ${token}`);
    assert.equal(reload.status, 200);
    assert.equal(reload.body.profile.name, 'Sam');
    assert.equal(reload.body.profile.raceDistance, 'Olympic');
  });

  it('rejects an invalid logged session and can clear a stored plan', async () => {
    const app = createApp({ env: testEnv });
    const token = await register(app, 'plan@example.com');
    const saved = await request(app).put('/me/profile').set('Authorization', `Bearer ${token}`).send(profile);
    assert.equal(saved.body.plan?.kind, 'starter');

    const listed = await request(app).get('/me/sessions').set('Authorization', `Bearer ${token}`);
    assert.equal(listed.status, 200);
    assert.deepEqual(listed.body.sessions, []);

    const bad = await request(app)
      .post('/me/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'ses_bad', sport: 'yoga' });
    assert.equal(bad.status, 400);

    const cleared = await request(app)
      .put('/me/plan')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: null });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.plan, null);
  });

  it('keeps athlete data isolated per account', async () => {
    const app = createApp({ env: testEnv });
    const sam = await register(app, 'a@example.com');
    const pat = await register(app, 'b@example.com');
    await request(app).put('/me/profile').set('Authorization', `Bearer ${sam}`).send(profile);
    await request(app).post('/me/sessions').set('Authorization', `Bearer ${sam}`).send(session);

    const other = await request(app).get('/me').set('Authorization', `Bearer ${pat}`);
    assert.equal(other.status, 200);
    assert.equal(other.body.profile, null);
    assert.deepEqual(other.body.sessions, []);
    assert.equal(other.body.plan, null);
  });
});
