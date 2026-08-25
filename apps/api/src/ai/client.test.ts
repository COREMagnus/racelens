import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type OpenAI from 'openai';

import { createOpenAiClient, isOpenAiConfigured, requireOpenAiKey } from './client';
import { AiConfigError, AiParseError, AiUpstreamError, httpStatusForAiError } from './errors';

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

describe('createOpenAiClient adapter', () => {
  it('parses a structured session from a fake SDK', async () => {
    const sdk = {
      chat: {
        completions: {
          async parse() {
            return {
              choices: [
                {
                  message: {
                    parsed: {
                      sport: 'run',
                      durationMin: 30,
                      intensity: 'easy',
                      load: null,
                      rpe: 3,
                      notes: 'ok',
                      startedAt: null,
                    },
                  },
                },
              ],
            };
          },
          async create() {
            return { choices: [{ message: { content: 'Hold Z2.' } }] };
          },
        },
      },
      audio: {
        transcriptions: {
          async create() {
            return { text: 'easy 30 min run' };
          },
        },
      },
    };

    const client = createOpenAiClient({
      sdk: sdk as unknown as OpenAI,
      env: { OPENAI_API_KEY: 'sk-test', OPENAI_TEXT_MODEL: 'gpt-4.1-mini' },
    });
    const session = await client.parseSession({ messages: [], model: 'gpt-4.1-mini' });
    assert.equal(session.sport, 'run');
    const reply = await client.completeCoach({ messages: [], model: 'gpt-4.1-mini' });
    assert.equal(reply, 'Hold Z2.');
    const transcript = await client.transcribe({
      buffer: Buffer.from('x'),
      filename: 'audio.m4a',
      mime: 'audio/m4a',
    });
    assert.equal(transcript, 'easy 30 min run');
  });

  it('maps SDK failures to AiUpstreamError without leaking keys', async () => {
    const sdk = {
      chat: {
        completions: {
          async parse() {
            throw new Error('denied sk-live-secret-key');
          },
          async create() {
            return { choices: [{ message: { content: '' } }] };
          },
        },
      },
      audio: { transcriptions: { async create() { return { text: '' }; } } },
    };
    const client = createOpenAiClient({
      sdk: sdk as unknown as OpenAI,
      env: { OPENAI_API_KEY: 'sk-live-secret-key' },
    });
    await assert.rejects(
      () => client.parseSession({ messages: [], model: 'gpt-4.1-mini' }),
      (error: unknown) =>
        error instanceof AiUpstreamError &&
        !error.message.includes('sk-live-secret-key') &&
        error.message.includes('sk-***'),
    );
    await assert.rejects(
      () => client.completeCoach({ messages: [], model: 'gpt-4.1-mini' }),
      AiParseError,
    );
  });
});
