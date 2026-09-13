import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hashPassword, scryptN, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies a hash and rejects a wrong password', () => {
    const env = { NODE_ENV: 'test', AUTH_SCRYPT_N: '4' };
    const hash = hashPassword('correct-horse', env);
    assert.equal(verifyPassword('correct-horse', hash), true);
    assert.equal(verifyPassword('wrong-password', hash), false);
    assert.equal(verifyPassword('correct-horse', 'not-a-hash'), false);
    assert.equal(scryptN(env), 4);
    assert.equal(scryptN({ NODE_ENV: 'test' }), 4);
  });
});
