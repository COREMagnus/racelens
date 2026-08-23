import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CoachChatRequest, WeekPlan } from '@racelens/shared';

import type { AiClient } from './client';
import { coachReply } from './coach';

const request: CoachChatRequest = {
  messages: [
    {
      id: 'm1',
      role: 'athlete',
      content: 'I am sore and slept badly. Should I still do the Saturday brick?',
      createdAt: '2026-08-23T11:00:00.000Z',
    },
  ],
  athlete: {
    name: 'Alex',
    raceGoalDate: '2026-10-04',
    raceDistance: '70.3',
    readinessScore: 58,
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

describe('coachReply', () => {
  it('returns a coach message from the model and grounds the system prompt', async () => {
    let system = '';
    let lastUser = '';
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
        const user = [...messages].reverse().find((message) => message.role === 'user');
        lastUser = typeof user?.content === 'string' ? user.content : '';
        return 'Shorten the brick. Keep the ride Z2 and jog 10 easy off the bike.';
      },
    };

    const reply = await coachReply(request, {
      client,
      weekPlan,
      id: 'msg_coach',
      now: new Date('2026-08-23T12:00:00.000Z'),
    });

    assert.equal(reply.id, 'msg_coach');
    assert.equal(reply.role, 'coach');
    assert.match(reply.content, /Shorten the brick/);
    assert.match(system, /Alex/);
    assert.match(system, /70\.3/);
    assert.match(system, /58/);
    assert.match(system, /Bike-run brick/);
    assert.match(lastUser, /sore/);
  });
});
