import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeSession } from './analyze';
import type { AiClient } from './client';
import { AiConfigError, AiParseError, httpStatusForAiError } from './errors';
import type { SessionExtraction } from './schema';

function mockClient(overrides: Partial<AiClient> = {}): AiClient {
  return {
    async parseSession() {
      const extracted: SessionExtraction = {
        sport: 'run',
        durationMin: 60,
        intensity: 'z3',
        load: null,
        rpe: 6,
        notes: 'Tempo run from transcript.',
        startedAt: null,
      };
      return extracted;
    },
    async completeCoach() {
      return 'Hold Z2 today.';
    },
    async transcribe() {
      return '60 min tempo run, RPE 7, humid.';
    },
    ...overrides,
  };
}

describe('analyzeSession', () => {
  it('structures a text capture via the injected client', async () => {
    const session = await analyzeSession(
      { type: 'text', payload: '60 min tempo run' },
      { client: mockClient(), id: 'ses_text', now: new Date('2026-08-23T12:00:00.000Z') },
    );
    assert.equal(session.id, 'ses_text');
    assert.equal(session.sport, 'run');
    assert.equal(session.durationMin, 60);
    assert.equal(session.source, 'text');
    assert.equal(session.intensity, 'z3');
  });

  it('transcribes audio then structures the transcript', async () => {
    let transcribed = false;
    let userContent = '';
    const client = mockClient({
      async transcribe() {
        transcribed = true;
        return '45 min easy bike';
      },
      async parseSession({ messages }) {
        const last = messages.at(-1);
        if (last && typeof last.content === 'string') {
          userContent = last.content;
        }
        return {
          sport: 'bike',
          durationMin: 45,
          intensity: 'easy',
          load: 27,
          rpe: 3,
          notes: 'Easy bike from voice.',
          startedAt: null,
        };
      },
    });

    const session = await analyzeSession(
      { type: 'voice', payload: 'data:audio/m4a;base64,AAAA' },
      { client, id: 'ses_voice' },
    );
    assert.equal(transcribed, true);
    assert.match(userContent, /45 min easy bike/);
    assert.equal(session.sport, 'bike');
    assert.equal(session.source, 'voice');
  });

  it('sends photo data URIs to the vision path', async () => {
    let usedImage = false;
    const client = mockClient({
      async parseSession({ messages, model }) {
        const last = messages.at(-1);
        usedImage = Array.isArray(last?.content);
        assert.match(model, /./);
        return {
          sport: 'swim',
          durationMin: 50,
          intensity: 'z2',
          load: 38,
          rpe: 4,
          notes: 'Watch screen swim.',
          startedAt: null,
        };
      },
    });

    const session = await analyzeSession(
      { type: 'photo', payload: 'data:image/jpeg;base64,/9j/4AAQ' },
      { client, id: 'ses_photo' },
    );
    assert.equal(usedImage, true);
    assert.equal(session.sport, 'swim');
    assert.equal(session.source, 'photo');
  });

  it('surfaces parse failures as AiParseError (HTTP 422)', async () => {
    const client = mockClient({
      async parseSession() {
        throw new AiParseError('Could not map the model output onto a Session (sport: Invalid enum).');
      },
    });

    await assert.rejects(
      () => analyzeSession({ type: 'text', payload: 'asdf' }, { client }),
      AiParseError,
    );
  });
});

describe('httpStatusForAiError', () => {
  it('maps missing key to 503 and junk output to 422', () => {
    assert.equal(
      httpStatusForAiError(new AiConfigError('OPENAI_API_KEY is not set.')).status,
      503,
    );
    assert.equal(httpStatusForAiError(new AiParseError('junk')).status, 422);
  });
});
