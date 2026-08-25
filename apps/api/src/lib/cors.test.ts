import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isAllowedOrigin } from './cors';

describe('CORS allowlist', () => {
  it('allows requests with no Origin (native / curl)', () => {
    assert.equal(isAllowedOrigin(undefined, { NODE_ENV: 'production' }), true);
    assert.equal(isAllowedOrigin('', { NODE_ENV: 'production' }), true);
  });

  it('allows listed browser origins', () => {
    assert.equal(
      isAllowedOrigin('https://app.triadapt.example', {
        CORS_ORIGINS: 'https://app.triadapt.example,http://localhost:8081',
        NODE_ENV: 'production',
      }),
      true,
    );
  });

  it('rejects arbitrary browser origins in production', () => {
    assert.equal(
      isAllowedOrigin('https://evil.example', { NODE_ENV: 'production' }),
      false,
    );
    assert.equal(
      isAllowedOrigin('https://evil.example', {
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://app.triadapt.example',
      }),
      false,
    );
  });

  it('allows localhost origins in local dev when the allowlist is empty', () => {
    assert.equal(isAllowedOrigin('http://localhost:8081', { NODE_ENV: 'development' }), true);
    assert.equal(isAllowedOrigin('http://127.0.0.1:3001', {}), true);
  });
});
