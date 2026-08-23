import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AiParseError } from './errors';
import { estimateLoad } from './load';
import { mapExtractedSession, parseModelJson, sessionFromModelOutput } from './map-session';
import type { SessionExtraction } from './schema';

const extracted: SessionExtraction = {
  sport: 'bike',
  durationMin: 45.4,
  intensity: 'easy',
  load: null,
  rpe: 4,
  notes: 'Easy spin, felt smooth.',
  startedAt: null,
};

describe('mapExtractedSession', () => {
  it('fills id, source, startedAt, and estimated load', () => {
    const now = new Date('2026-08-23T12:00:00.000Z');
    const session = mapExtractedSession(extracted, 'text', { now, id: 'ses_test' });
    assert.equal(session.id, 'ses_test');
    assert.equal(session.source, 'text');
    assert.equal(session.sport, 'bike');
    assert.equal(session.durationMin, 45);
    assert.equal(session.intensity, 'easy');
    assert.equal(session.rpe, 4);
    assert.equal(session.load, estimateLoad(45, 'easy'));
    assert.equal(session.startedAt, now.toISOString());
    assert.equal(session.notes, 'Easy spin, felt smooth.');
  });

  it('keeps a positive model load and clamps RPE', () => {
    const session = mapExtractedSession(
      { ...extracted, load: 80, rpe: 12, durationMin: 60 },
      'voice',
      { id: 'ses_2', now: new Date('2026-01-01T00:00:00.000Z') },
    );
    assert.equal(session.load, 80);
    assert.equal(session.rpe, 10);
  });

  it('parses a valid startedAt', () => {
    const session = mapExtractedSession(
      { ...extracted, startedAt: '2026-08-01T07:30:00-04:00' },
      'photo',
      { id: 'ses_3' },
    );
    assert.equal(session.startedAt, new Date('2026-08-01T07:30:00-04:00').toISOString());
    assert.equal(session.source, 'photo');
  });
});

describe('sessionFromModelOutput', () => {
  it('maps a valid object', () => {
    const session = sessionFromModelOutput(extracted, 'text', { id: 'ses_ok' });
    assert.equal(session.sport, 'bike');
  });

  it('returns 422-style AiParseError for junk', () => {
    assert.throws(
      () => sessionFromModelOutput({ sport: 'kayak', durationMin: 'long' }, 'text', { id: 'x' }),
      AiParseError,
    );
  });
});

describe('parseModelJson', () => {
  it('parses a raw object', () => {
    assert.deepEqual(parseModelJson('{"sport":"run"}'), { sport: 'run' });
  });

  it('parses a fenced JSON block', () => {
    assert.deepEqual(parseModelJson('Sure.\n```json\n{"sport":"swim"}\n```'), { sport: 'swim' });
  });

  it('rejects non-JSON', () => {
    assert.throws(() => parseModelJson('not a session'), AiParseError);
  });
});
