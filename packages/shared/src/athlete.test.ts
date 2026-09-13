import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  emptyAthleteProfile,
  hasRaceGoal,
  hasRequiredOnboardingFields,
  normalizeAthleteProfile,
  parseStoredAthleteProfile,
  raceGoalLabel,
  validateOnboarding,
  weeklyVolumeHours,
} from './athlete';

describe('athlete profile', () => {
  it('treats an empty / missing store as unknown — never invents Alex, 70.3, or readiness', () => {
    const empty = parseStoredAthleteProfile(null);
    assert.deepEqual(empty, emptyAthleteProfile());
    assert.equal(empty.name, '');
    assert.equal(hasRaceGoal(empty), false);
    assert.equal(hasRequiredOnboardingFields(empty), false);
    assert.equal(raceGoalLabel(empty), 'No race goal yet');
    assert.doesNotMatch(JSON.stringify(empty), /Alex|70\.3|74/);
  });

  it('requires name, distance (or not racing), volume, and a date when racing', () => {
    const incomplete = {
      name: '',
      raceGoalDate: '',
      weeklyVolume: {},
      constraints: '',
    };
    const errors = validateOnboarding(incomplete);
    assert.equal(errors.name, 'Enter a display name.');
    assert.match(errors.raceDistance ?? '', /race distance/);
    assert.match(errors.weeklyVolume ?? '', /weekly hours/);
    assert.equal(hasRequiredOnboardingFields(incomplete), false);

    const racingNoDate = validateOnboarding({
      name: 'Sam',
      raceDistance: '70.3',
      raceGoalDate: '',
      weeklyVolume: { totalHours: 8 },
      constraints: '',
    });
    assert.match(racingNoDate.raceGoalDate ?? '', /goal race date/);

    const notRacing = validateOnboarding({
      name: 'Sam',
      raceDistance: 'none',
      raceGoalDate: '',
      weeklyVolume: { totalHours: 6 },
      constraints: '',
    });
    assert.deepEqual(notRacing, {});
    assert.equal(
      hasRequiredOnboardingFields(
        normalizeAthleteProfile({
          name: 'Sam',
          raceDistance: 'none',
          raceGoalDate: '',
          weeklyVolume: { totalHours: 6 },
          constraints: '',
        }),
      ),
      true,
    );
    assert.equal(
      hasRaceGoal(
        normalizeAthleteProfile({
          name: 'Sam',
          raceDistance: 'none',
          raceGoalDate: '',
          weeklyVolume: { totalHours: 6 },
          constraints: '',
        }),
      ),
      false,
    );
  });

  it('accepts swim/bike/run hours instead of a single total', () => {
    const profile = normalizeAthleteProfile({
      name: 'Sam',
      raceDistance: 'Olympic',
      raceGoalDate: '2026-11-08',
      weeklyVolume: { swimHours: 2, bikeHours: 4, runHours: 2 },
      constraints: '',
    });
    assert.equal(weeklyVolumeHours(profile.weeklyVolume), 8);
    assert.equal(hasRequiredOnboardingFields(profile), true);
    assert.equal(hasRaceGoal(profile), true);
  });

  it('migrates a v1 stored profile without inventing volume or readiness', () => {
    const migrated = parseStoredAthleteProfile({
      name: 'Jordan',
      raceGoalDate: '2026-10-04',
      raceDistance: '70.3',
    });
    assert.equal(migrated.name, 'Jordan');
    assert.equal(migrated.raceDistance, '70.3');
    assert.equal(migrated.raceGoalDate, '2026-10-04');
    assert.deepEqual(migrated.weeklyVolume, {});
    assert.equal(hasRequiredOnboardingFields(migrated), false);
    assert.equal(hasRaceGoal(migrated), true);
    assert.doesNotMatch(JSON.stringify(migrated), /readiness|74/);
  });

  it('drops invalid distance / experience and keeps constraints within the short-field limit', () => {
    const parsed = parseStoredAthleteProfile({
      name: 'n'.repeat(200),
      raceDistance: 'Ultra',
      raceGoalDate: 'soon',
      experienceLevel: 'pro',
      constraints: 'c'.repeat(600),
      weeklyVolume: { totalHours: 7 },
    });
    assert.equal(parsed.name.length, 120);
    assert.equal(parsed.raceDistance, undefined);
    assert.equal(parsed.experienceLevel, undefined);
    assert.equal(parsed.constraints.length, 500);
  });

  it('labels a race goal with weeks out and stays unknown without one', () => {
    const now = new Date('2026-08-23T00:00:00.000Z');
    assert.equal(
      raceGoalLabel({ raceDistance: '70.3', raceGoalDate: '2026-10-04' }, now),
      '70.3 · 2026-10-04 · 6 weeks out',
    );
    assert.equal(raceGoalLabel({ raceGoalDate: '' }, now), 'No race goal yet');
    assert.equal(
      raceGoalLabel({ raceDistance: 'Sprint', raceGoalDate: 'not-a-date' }, now),
      'Sprint · date unknown',
    );
  });
});
