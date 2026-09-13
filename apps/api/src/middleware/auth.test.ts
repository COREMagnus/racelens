import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readBearerToken } from './auth';

describe('bearer token', () => {
  it('reads a Bearer token and rejects other schemes', () => {
    assert.equal(readBearerToken('Bearer abc.def'), 'abc.def');
    assert.equal(readBearerToken('bearer abc'), 'abc');
    assert.equal(readBearerToken(undefined), null);
    assert.equal(readBearerToken('Token abc'), null);
    assert.equal(readBearerToken('Bearer'), null);
  });
});
