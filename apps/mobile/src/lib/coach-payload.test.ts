import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CoachMessage } from '@racelens/shared';
import { generateStarterWeek, normalizeAthleteProfile, sampleWeekPlan } from '@racelens/shared';

import { buildCoachChatRequest, toAthleteContext } from './coach-payload';

const now = new Date('2026-08-24T12:00:00.000Z');

const messages: CoachMessage[] = [
  {
    id: 'm1',
    role: 'athlete',
    content: 'How should I handle fatigue?',
    createdAt: '2026-08-24T12:00:00.000Z',
  },
];

const incomplete = normalizeAthleteProfile({
  name: 'Sam',
  raceDistance: 'none',
  raceGoalDate: '',
  weeklyVolume: { totalHours: 5 },
  constraints: '',
});

const complete = normalizeAthleteProfile({
  name: 'Sam',
  raceDistance: '70.3',
  raceGoalDate: '2026-11-08',
  weeklyVolume: { totalHours: 8 },
  experienceLevel: 'intermediate',
  constraints: 'Limited pool access',
});

describe('coach payload', () => {
  it('does not send a sample plan or readiness 74 when the profile has no race goal', () => {
    const demo = sampleWeekPlan(now);
    const body = buildCoachChatRequest(messages, incomplete, { weekPlan: demo });
    assert.equal(body.athlete.name, 'Sam');
    assert.equal(body.athlete.raceDistance, undefined);
    assert.equal(body.athlete.raceGoalDate, undefined);
    assert.equal(body.athlete.readinessScore, undefined);
    assert.equal(body.weekPlan, undefined);
    assert.doesNotMatch(JSON.stringify(body), /readiness 74|74/);
    assert.doesNotMatch(JSON.stringify(body), /Bike-run brick/);
  });

  it('passes real goal fields and a starter week when they exist', () => {
    const starter = generateStarterWeek(complete, now);
    assert.ok(starter);
    const body = buildCoachChatRequest(messages, complete, { weekPlan: starter });
    assert.equal(body.athlete.raceDistance, '70.3');
    assert.equal(body.athlete.raceGoalDate, '2026-11-08');
    assert.equal(body.athlete.weeklyVolumeHours, 8);
    assert.equal(body.athlete.experienceLevel, 'intermediate');
    assert.equal(body.athlete.constraints, 'Limited pool access');
    assert.equal(body.athlete.readinessScore, undefined);
    assert.equal(body.weekPlan?.kind, 'starter');
    assert.match(body.weekPlan?.theme ?? '', /70\.3/);
    assert.equal(body.weekPlan?.readinessScore, undefined);
    assert.doesNotMatch(JSON.stringify(body), /"readinessScore":74/);
  });

  it('maps an empty stored profile to unknown coach fields', () => {
    const athlete = toAthleteContext({
      name: '',
      raceGoalDate: '',
      weeklyVolume: {},
      constraints: '',
    });
    assert.equal(athlete.name, 'athlete');
    assert.equal(athlete.raceDistance, undefined);
    assert.equal(athlete.readinessScore, undefined);
    assert.equal(athlete.weeklyVolumeHours, undefined);
  });
});
