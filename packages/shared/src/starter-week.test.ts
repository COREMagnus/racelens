import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeAthleteProfile } from './athlete';
import { isDemoWeekPlan, isStarterWeekPlan, planBanner } from './plan';
import {
  canGenerateStarterWeek,
  generateStarterWeek,
  resolveWeekPlan,
  sampleWeekPlan,
} from './starter-week';

const now = new Date('2026-08-24T12:00:00.000Z');

const complete = normalizeAthleteProfile({
  name: 'Sam',
  raceDistance: '70.3',
  raceGoalDate: '2026-11-08',
  weeklyVolume: { totalHours: 8 },
  experienceLevel: 'intermediate',
  constraints: '',
});

const incomplete = normalizeAthleteProfile({
  name: 'Sam',
  raceDistance: 'none',
  raceGoalDate: '',
  weeklyVolume: { totalHours: 6 },
  constraints: '',
});

describe('starter week', () => {
  it('generates a labeled starter week from a real race goal + volume and does not invent readiness', () => {
    assert.equal(canGenerateStarterWeek(complete), true);
    const week = generateStarterWeek(complete, now);
    assert.ok(week);
    assert.equal(week.kind, 'starter');
    assert.equal(isStarterWeekPlan(week), true);
    assert.match(week.theme, /70\.3/);
    assert.match(week.theme, /weeks out/);
    assert.match(week.theme, /Starter week/);
    assert.equal(week.readinessScore, undefined);
    assert.match(week.readinessNote, /Readiness unknown/);
    assert.doesNotMatch(week.readinessNote, /74|HRV look|sleep quality/i);
    assert.ok(week.sessions.length >= 5);
    const minutes = week.sessions.reduce((sum, session) => sum + session.durationMin, 0);
    assert.ok(minutes >= 240);
    assert.ok(minutes <= 8 * 60 + 90);
    assert.equal(planBanner(week), week.theme);
  });

  it('returns null and a labeled demo plan when the race goal is missing', () => {
    assert.equal(canGenerateStarterWeek(incomplete), false);
    assert.equal(generateStarterWeek(incomplete, now), null);
    assert.equal(generateStarterWeek({ ...complete, weeklyVolume: {} }, now), null);

    const demo = sampleWeekPlan(now);
    assert.equal(demo.kind, 'demo');
    assert.equal(demo.readinessScore, 74);
    assert.match(demo.theme, /demo/i);
    assert.match(demo.readinessNote, /Demo data only/i);
    assert.equal(isDemoWeekPlan(demo), true);
    assert.equal(planBanner(demo), 'Demo plan — not based on your goal');

    const resolved = resolveWeekPlan(incomplete, now);
    assert.equal(resolved.kind, 'demo');
    assert.equal(planBanner(resolved), 'Demo plan — not based on your goal');

    const fromGoal = resolveWeekPlan(complete, now);
    assert.equal(fromGoal.kind, 'starter');
    assert.match(fromGoal.theme, /70\.3/);
  });

  it('scales long-course sessions longer than sprint for the same hours', () => {
    const sprint = generateStarterWeek(
      { ...complete, raceDistance: 'Sprint', raceGoalDate: '2026-10-04' },
      now,
    );
    const ironman = generateStarterWeek(
      { ...complete, raceDistance: 'Ironman', raceGoalDate: '2027-08-01' },
      now,
    );
    assert.ok(sprint && ironman);
    const sprintLong = Math.max(...sprint.sessions.map((session) => session.durationMin));
    const ironmanLong = Math.max(...ironman.sessions.map((session) => session.durationMin));
    assert.ok(ironmanLong >= sprintLong);
    assert.match(ironman.theme, /Ironman/);
    assert.match(sprint.theme, /Sprint/);
  });
});
