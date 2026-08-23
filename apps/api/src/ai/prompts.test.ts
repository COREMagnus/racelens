import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AthleteContext, Session, WeekPlan } from '@racelens/shared';

import {
  ANALYZE_SYSTEM_PROMPT,
  COACH_SYSTEM_PROMPT,
  analyzeUserPrompt,
  buildCoachSystemPrompt,
  daysUntil,
  toOpenAiRole,
} from './prompts';

const athlete: AthleteContext = {
  name: 'Alex',
  raceGoalDate: '2026-10-04',
  raceDistance: '70.3',
  readinessScore: 61,
};

describe('prompts', () => {
  it('keeps analyze instructions triathlon-structured', () => {
    assert.match(ANALYZE_SYSTEM_PROMPT, /swim, bike, run, brick/);
    assert.match(ANALYZE_SYSTEM_PROMPT, /z1/);
    assert.match(ANALYZE_SYSTEM_PROMPT, /rpe/i);
  });

  it('keeps the coach prompt concise and race-aware', () => {
    assert.match(COACH_SYSTEM_PROMPT, /triathlon/i);
    assert.match(COACH_SYSTEM_PROMPT, /readiness/i);
    assert.match(COACH_SYSTEM_PROMPT, /race goal/i);
    assert.match(COACH_SYSTEM_PROMPT, /Z1–Z5|Z1-Z5/);
  });

  it('labels photo / voice / text user prompts', () => {
    assert.match(analyzeUserPrompt('photo', 'Garmin screenshot'), /photo/);
    assert.match(analyzeUserPrompt('voice', 'easy 40 min run'), /transcript/);
    assert.match(analyzeUserPrompt('text', 'brick 90'), /workout description/);
  });

  it('grounds the coach system prompt in athlete, plan, and sessions', () => {
    const now = new Date('2026-08-23T00:00:00.000Z');
    const weekPlan: WeekPlan = {
      weekStart: '2026-08-17',
      theme: 'Build week',
      readinessScore: 61,
      readinessNote: 'Protect the Saturday brick.',
      sessions: [
        {
          id: 'plan_sat_brick',
          weekday: 'saturday',
          date: '2026-08-22',
          sport: 'brick',
          title: 'Bike-run brick',
          durationMin: 90,
          intensity: 'mod',
          focus: '60 ride + 20 run',
        },
      ],
    };
    const recentSessions: Session[] = [
      {
        id: 'ses_1',
        sport: 'run',
        startedAt: '2026-08-21T10:00:00.000Z',
        durationMin: 40,
        intensity: 'easy',
        load: 24,
        rpe: 3,
        notes: 'Legs heavy',
        source: 'text',
      },
    ];

    const prompt = buildCoachSystemPrompt(athlete, { weekPlan, recentSessions, now });
    assert.match(prompt, /Alex/);
    assert.match(prompt, /70\.3/);
    assert.match(prompt, /61/);
    assert.match(prompt, /Bike-run brick/);
    assert.match(prompt, /Legs heavy/);
    assert.equal(daysUntil(athlete.raceGoalDate, now), 42);
    assert.match(prompt, /42 days out/);
  });

  it('maps coach roles onto OpenAI chat roles', () => {
    assert.equal(toOpenAiRole('athlete'), 'user');
    assert.equal(toOpenAiRole('coach'), 'assistant');
  });
});
