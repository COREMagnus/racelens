import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isValidEmail, normalizeEmail } from './email';

describe('email', () => {
  it('normalizes and validates emails', () => {
    assert.equal(normalizeEmail('  Sam@Example.COM '), 'sam@example.com');
    assert.equal(isValidEmail('sam@example.com'), true);
    assert.equal(isValidEmail('not-an-email'), false);
    assert.equal(isValidEmail(''), false);
  });
});
