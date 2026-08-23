import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isOpenAiConfigured, requireOpenAiKey } from './client';
import { AiConfigError, httpStatusForAiError } from './errors';

describe('OpenAI configuration', () => {
  it('is unconfigured without a key', () => {
    assert.equal(isOpenAiConfigured({}), false);
    assert.throws(() => requireOpenAiKey({}), AiConfigError);
    try {
      requireOpenAiKey({ OPENAI_API_KEY: '   ' });
      assert.fail('expected throw');
    } catch (error) {
      assert.equal(httpStatusForAiError(error).status, 503);
      assert.match(httpStatusForAiError(error).error, /OPENAI_API_KEY/);
    }
  });

  it('reads a trimmed key', () => {
    assert.equal(isOpenAiConfigured({ OPENAI_API_KEY: ' sk-test ' }), true);
    assert.equal(requireOpenAiKey({ OPENAI_API_KEY: ' sk-test ' }), 'sk-test');
  });
});
