import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  emptyAthleteProfile,
  hasRequiredOnboardingFields,
  parseStoredAthleteProfile,
} from '@racelens/shared';

import { resolveRootRoute } from './nav';
import { parseStoredAuth } from './auth';
import { AUTH_STORAGE_KEY, PLAN_STORAGE_KEY, SESSIONS_STORAGE_KEY, STORAGE_KEY } from './storage-key';

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

describe('auth and navigation', () => {
  it('keeps companion storage keys off the athlete v1 key', () => {
    assert.equal(AUTH_STORAGE_KEY, 'racelens.auth.v1');
    assert.equal(SESSIONS_STORAGE_KEY, 'racelens.sessions.v1');
    assert.equal(PLAN_STORAGE_KEY, 'racelens.plan.v1');
  });

  it('parses a stored session token and rejects garbage', () => {
    assert.deepEqual(parseStoredAuth(JSON.stringify({ token: 'abc', user: { id: 'usr_1', email: 'sam@example.com' } })), {
      token: 'abc',
      user: { id: 'usr_1', email: 'sam@example.com' },
    });
    assert.equal(parseStoredAuth(null), null);
    assert.equal(parseStoredAuth('{"token":""}'), null);
  });

  it('sends signed-in users with an incomplete profile through onboarding', () => {
    assert.equal(
      resolveRootRoute({
        authLoaded: true,
        profileLoaded: true,
        token: 'tok',
        hasCompletedOnboarding: false,
      }),
      'onboarding',
    );
    assert.equal(
      resolveRootRoute({
        authLoaded: true,
        profileLoaded: true,
        token: 'tok',
        hasCompletedOnboarding: true,
      }),
      'tabs',
    );
    assert.equal(
      resolveRootRoute({
        authLoaded: true,
        profileLoaded: true,
        token: null,
        hasCompletedOnboarding: false,
      }),
      'sign-in',
    );
    assert.equal(
      resolveRootRoute({
        authLoaded: false,
        profileLoaded: true,
        token: null,
        hasCompletedOnboarding: false,
      }),
      'boot',
    );
  });
});
