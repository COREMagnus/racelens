import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PRODUCTION_AI_DISABLED_MESSAGE, isUnauthenticatedAiAllowed } from './access';
import { isProduction } from './env';

describe('AI access', () => {
  it('allows unauthenticated AI outside production', () => {
    assert.equal(isProduction({ NODE_ENV: 'test' }), false);
    assert.equal(isUnauthenticatedAiAllowed({ NODE_ENV: 'test' }), true);
    assert.equal(isUnauthenticatedAiAllowed({ NODE_ENV: 'development' }), true);
    assert.equal(isUnauthenticatedAiAllowed({}), true);
  });

  it('hard-disables unauthenticated AI in production', () => {
    assert.equal(isProduction({ NODE_ENV: 'production' }), true);
    assert.equal(isUnauthenticatedAiAllowed({ NODE_ENV: 'production' }), false);
    assert.equal(isUnauthenticatedAiAllowed({ NODE_ENV: 'PRODUCTION' }), false);
    assert.match(PRODUCTION_AI_DISABLED_MESSAGE, /Authenticated AI access is not configured/);
  });
});
