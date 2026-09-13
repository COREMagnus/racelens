import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AUTH_REQUIRED_AI_MESSAGE,
  aiAccessMode,
  isAiRouteAllowed,
  isUnauthenticatedAiAllowed,
} from './access';
import { isProduction, isTest } from './env';

describe('AI access', () => {
  it('allows unauthenticated AI outside production', () => {
    assert.equal(isProduction({ NODE_ENV: 'test' }), false);
    assert.equal(isTest({ NODE_ENV: 'test' }), true);
    assert.equal(isUnauthenticatedAiAllowed({ NODE_ENV: 'test' }), true);
    assert.equal(isUnauthenticatedAiAllowed({ NODE_ENV: 'development' }), true);
    assert.equal(isUnauthenticatedAiAllowed({}), true);
    assert.equal(isAiRouteAllowed({ NODE_ENV: 'test' }, false), true);
    assert.equal(aiAccessMode({ NODE_ENV: 'test' }), 'local');
  });

  it('requires an authenticated user for AI in production', () => {
    assert.equal(isProduction({ NODE_ENV: 'production' }), true);
    assert.equal(isUnauthenticatedAiAllowed({ NODE_ENV: 'production' }), false);
    assert.equal(isUnauthenticatedAiAllowed({ NODE_ENV: 'PRODUCTION' }), false);
    assert.equal(isAiRouteAllowed({ NODE_ENV: 'production' }, false), false);
    assert.equal(isAiRouteAllowed({ NODE_ENV: 'production' }, true), true);
    assert.equal(aiAccessMode({ NODE_ENV: 'production' }), 'authenticated');
    assert.match(AUTH_REQUIRED_AI_MESSAGE, /Sign in required/);
  });
});
