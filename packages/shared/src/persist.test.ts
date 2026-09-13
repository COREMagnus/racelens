import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateStarterWeek, normalizeAthleteProfile, sampleWeekPlan } from './index';
import { parseStoredSession, parseStoredSessions, parseStoredWeekPlan } from './persist';
import { displayWeekPlan } from './starter-week';

const session = {
  id: 'ses_1',
  sport: 'run',
  startedAt: '2026-08-21T10:00:00.000Z',
  durationMin: 40,
  intensity: 'easy',
  load: 24,
  rpe: 3,
  notes: 'Legs heavy',
  source: 'text',
};

describe('persisted sessions and plans', () => {
  it('round-trips a logged session and drops garbage', () => {
    assert.deepEqual(parseStoredSession(session), session);
    assert.equal(parseStoredSession({ ...session, sport: 'yoga' }), null);
    assert.deepEqual(parseStoredSessions([session, { id: 'nope' }, null]), [session]);
    assert.deepEqual(parseStoredSessions({ not: 'an array' }), []);
  });

  it('accepts a starter week and rejects demo weeks so they never persist', () => {
    const profile = normalizeAthleteProfile({
      name: 'Sam',
      raceDistance: '70.3',
      raceGoalDate: '2026-11-08',
      weeklyVolume: { totalHours: 8 },
      constraints: '',
    });
    const starter = generateStarterWeek(profile, new Date('2026-08-24T12:00:00.000Z'));
    assert.ok(starter);
    assert.equal(parseStoredWeekPlan(starter)?.kind, 'starter');
    assert.equal(parseStoredWeekPlan(sampleWeekPlan(new Date('2026-08-24T12:00:00.000Z'))), null);
    assert.equal(parseStoredWeekPlan({ theme: 'nope' }), null);
  });

  it('displays a persisted starter week and never treats demo as stored state', () => {
    const profile = normalizeAthleteProfile({
      name: 'Sam',
      raceDistance: '70.3',
      raceGoalDate: '2026-11-08',
      weeklyVolume: { totalHours: 8 },
      constraints: '',
    });
    const now = new Date('2026-08-24T12:00:00.000Z');
    const starter = generateStarterWeek(profile, now);
    assert.ok(starter);
    assert.equal(displayWeekPlan(profile, starter, now).kind, 'starter');
    assert.equal(displayWeekPlan(profile, starter, now).theme, starter.theme);
    const demo = sampleWeekPlan(now);
    assert.equal(displayWeekPlan(profile, demo, now).kind, 'starter');
  });
});
