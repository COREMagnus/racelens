import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  emptyAthleteProfile,
  hasRequiredOnboardingFields,
  parseStoredAthleteProfile,
} from '@racelens/shared';

import { STORAGE_KEY } from './storage-key';

describe('profile store', () => {
  it('keeps the racelens.athlete.v1 key and treats missing JSON as unknown', () => {
    assert.equal(STORAGE_KEY, 'racelens.athlete.v1');
    const parsed = parseStoredAthleteProfile(undefined);
    assert.deepEqual(parsed, emptyAthleteProfile());
    assert.equal(hasRequiredOnboardingFields(parsed), false);
  });

  it('round-trips a saved profile without inventing readiness', () => {
    const stored = {
      name: 'Sam',
      raceDistance: 'Olympic',
      raceGoalDate: '2026-09-20',
      weeklyVolume: { totalHours: 7, swimHours: 1.5 },
      experienceLevel: 'beginner',
      constraints: 'Travel weeks in October',
    };
    const raw = JSON.stringify(stored);
    const parsed = parseStoredAthleteProfile(JSON.parse(raw) as unknown);
    assert.equal(hasRequiredOnboardingFields(parsed), true);
    assert.equal(parsed.name, 'Sam');
    assert.equal(parsed.raceDistance, 'Olympic');
    assert.doesNotMatch(raw, /readiness|74/);
    assert.doesNotMatch(JSON.stringify(parsed), /readiness|74/);
  });
});
