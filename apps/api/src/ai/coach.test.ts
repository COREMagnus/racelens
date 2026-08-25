import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CoachChatRequest, WeekPlan } from '@racelens/shared';

import type { AiClient } from './client';
import { coachReply } from './coach';

const mobileStyleRequest: CoachChatRequest = {
  messages: [
    {
      id: 'm1',
      role: 'athlete',
      content: 'Should I still do a brick this weekend?',
      createdAt: '2026-08-23T11:00:00.000Z',
    },
  ],
  athlete: {
    name: 'Alex',
    raceGoalDate: '2026-10-04',
    raceDistance: '70.3',
  },
};

const weekPlan: WeekPlan = {
  weekStart: '2026-08-17',
  theme: 'Build week',
  readinessScore: 58,
  readinessNote: 'Fatigue stacking.',
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

function captureClient(): { client: AiClient; system: () => string } {
  let system = '';
  const client: AiClient = {
    async parseSession() {
      throw new Error('parseSession should not run');
    },
    async transcribe() {
      throw new Error('transcribe should not run');
    },
    async completeCoach({ messages }) {
      const sys = messages.find((message) => message.role === 'system');
      system = typeof sys?.content === 'string' ? sys.content : '';
      return 'Keep today aerobic and decide on the brick after you see how sleep goes.';
    },
  };
  return { client, system: () => system };
}

describe('coachReply', () => {
  it('does not inject sample-plan or fabricated readiness for an ordinary mobile request', async () => {
    const { client, system } = captureClient();
    await coachReply(mobileStyleRequest, {
      client,
      id: 'msg_coach',
      now: new Date('2026-08-23T12:00:00.000Z'),
    });
    const prompt = system();
    assert.doesNotMatch(prompt, /readiness 74/i);
    assert.doesNotMatch(prompt, /Readiness: 74/);
    assert.doesNotMatch(prompt, /Sleep and HRV look stable/);
    assert.doesNotMatch(prompt, /Saturday brick/);
    assert.doesNotMatch(prompt, /Bike-run brick/);
    assert.doesNotMatch(prompt, /Green light for the Saturday brick/);
    assert.match(prompt, /Not provided \(treat as unknown/);
  });

  it('rejects oversized coach context before calling OpenAI', async () => {
    let called = false;
    const client = captureClient().client;
    const guarded: typeof client = {
      ...client,
      async completeCoach(args) {
        called = true;
        return client.completeCoach(args);
      },
    };
    await assert.rejects(
      () =>
        coachReply(mobileStyleRequest, {
          client: guarded,
          env: { AI_MAX_COACH_CONTEXT_CHARS: '40' },
        }),
      /Coach textual context exceeds the 40 character limit/,
    );
    assert.equal(called, false);
  });

  it('passes through real readiness, sessions, and week plan when provided', async () => {
    const { client, system } = captureClient();
    await coachReply(
      {
        ...mobileStyleRequest,
        athlete: { ...mobileStyleRequest.athlete, readinessScore: 58 },
        recentSessions: [
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
        ],
        weekPlan,
      },
      { client, weekPlan, now: new Date('2026-08-23T12:00:00.000Z') },
    );
    const prompt = system();
    assert.match(prompt, /Readiness: 58/);
    assert.match(prompt, /Bike-run brick/);
    assert.match(prompt, /Legs heavy/);
    assert.doesNotMatch(prompt, /Not provided/);
  });
});
