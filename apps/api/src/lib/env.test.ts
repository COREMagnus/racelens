import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveLimits } from './env';

describe('resolveLimits', () => {
  it('uses documented defaults', () => {
    const limits = resolveLimits({});
    assert.equal(limits.jsonBodyLimit, '8mb');
    assert.equal(limits.maxPayloadChars, 6_000_000);
    assert.equal(limits.maxMediaBytes, 4 * 1024 * 1024);
    assert.equal(limits.rateLimitMax, 30);
  });

  it('parses overrides', () => {
    const limits = resolveLimits({
      AI_MAX_PAYLOAD_CHARS: '1000',
      AI_MAX_MEDIA_BYTES: '2048',
      AI_RATE_LIMIT_MAX: '0',
      AI_JSON_BODY_LIMIT: '2mb',
    });
    assert.equal(limits.maxPayloadChars, 1000);
    assert.equal(limits.maxMediaBytes, 2048);
    assert.equal(limits.rateLimitMax, 0);
    assert.equal(limits.jsonBodyLimit, '2mb');
  });
});
