import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSessionToken, hashSessionToken, sessionDays, sessionExpiryIso } from './token';

describe('session tokens', () => {
  it('hashes a random token and computes expiry', () => {
    const token = createSessionToken();
    assert.equal(token.length > 20, true);
    assert.notEqual(hashSessionToken(token), token);
    assert.equal(hashSessionToken(token), hashSessionToken(token));
    assert.equal(sessionDays({}), 30);
    assert.equal(sessionDays({ AUTH_SESSION_DAYS: '7' }), 7);
    const expires = sessionExpiryIso(new Date('2026-01-01T00:00:00.000Z'), 1);
    assert.equal(expires, '2026-01-02T00:00:00.000Z');
  });
});
