import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import { createApp } from '../app';
import { AUTH_REQUIRED_MESSAGE, INVALID_TOKEN_MESSAGE } from '../middleware/auth';

const testEnv = {
  NODE_ENV: 'test',
  AI_RATE_LIMIT_MAX: '0',
  AUTH_RATE_LIMIT_MAX: '0',
  DATABASE_PATH: ':memory:',
  AUTH_SCRYPT_N: '4',
};

describe('auth HTTP routes', () => {
  it('registers, logs in, and rejects bad credentials', async () => {
    const app = createApp({ env: testEnv });
    const created = await request(app)
      .post('/auth/register')
      .send({ email: 'Sam@Example.com', password: 'password12' });
    assert.equal(created.status, 201);
    assert.equal(created.body.user.email, 'sam@example.com');
    assert.equal(typeof created.body.token, 'string');
    assert.equal(created.body.profile, null);
    assert.deepEqual(created.body.sessions, []);
    assert.equal(created.body.plan, null);

    const duplicate = await request(app)
      .post('/auth/register')
      .send({ email: 'sam@example.com', password: 'password12' });
    assert.equal(duplicate.status, 409);

    const wrong = await request(app)
      .post('/auth/login')
      .send({ email: 'sam@example.com', password: 'not-the-password' });
    assert.equal(wrong.status, 401);
    assert.match(wrong.body.error, /Invalid email or password/);

    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'SAM@example.com', password: 'password12' });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.id, created.body.user.id);
    assert.notEqual(login.body.token, created.body.token);
  });

  it('rejects short passwords and invalid emails', async () => {
    const app = createApp({ env: testEnv });
    const short = await request(app).post('/auth/register').send({ email: 'sam@example.com', password: 'short' });
    const badEmail = await request(app).post('/auth/register').send({ email: 'not-an-email', password: 'password12' });
    assert.equal(short.status, 400);
    assert.equal(badEmail.status, 400);
  });

  it('rejects /me without a session and accepts a bearer token', async () => {
    const app = createApp({ env: testEnv });
    const anonymous = await request(app).get('/me');
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.body.error, AUTH_REQUIRED_MESSAGE);

    const created = await request(app)
      .post('/auth/register')
      .send({ email: 'pat@example.com', password: 'password12' });
    const me = await request(app).get('/me').set('Authorization', `Bearer ${created.body.token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, 'pat@example.com');

    const malformed = await request(app).get('/me').set('Authorization', 'Token nope');
    assert.equal(malformed.status, 401);
    assert.equal(malformed.body.error, INVALID_TOKEN_MESSAGE);

    const bogus = await request(app).get('/me').set('Authorization', 'Bearer not-a-real-token');
    assert.equal(bogus.status, 401);
  });

  it('logs out so the token no longer works', async () => {
    const app = createApp({ env: testEnv });
    const created = await request(app)
      .post('/auth/register')
      .send({ email: 'lea@example.com', password: 'password12' });
    const logout = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${created.body.token}`);
    assert.equal(logout.status, 200);
    const me = await request(app).get('/me').set('Authorization', `Bearer ${created.body.token}`);
    assert.equal(me.status, 401);
  });
});
