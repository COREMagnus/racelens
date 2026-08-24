import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeRequestSchema, coachChatRequestSchema, formatZodError } from './request-schema';

describe('request schemas', () => {
  it('accepts a valid analyze body', () => {
    const parsed = analyzeRequestSchema.parse({
      type: 'text',
      payload: '45 min easy bike',
    });
    assert.equal(parsed.type, 'text');
  });

  it('rejects an incomplete analyze body', () => {
    const result = analyzeRequestSchema.safeParse({ type: 'photo' });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(formatZodError(result.error), /payload/);
    }
  });

  it('accepts a mobile-style coach body without readiness, sessions, or plan', () => {
    const parsed = coachChatRequestSchema.parse({
      messages: [
        {
          id: 'm1',
          role: 'athlete',
          content: 'How should I taper?',
          createdAt: '2026-08-23T12:00:00.000Z',
        },
      ],
      athlete: {
        name: 'Alex',
        raceGoalDate: '2026-10-04',
        raceDistance: '70.3',
      },
    });
    assert.equal(parsed.athlete.readinessScore, undefined);
    assert.equal(parsed.weekPlan, undefined);
    assert.equal(parsed.recentSessions, undefined);
  });

  it('rejects a shallow / incomplete athlete object', () => {
    const result = coachChatRequestSchema.safeParse({
      messages: [],
      athlete: { name: 'Alex' },
    });
    assert.equal(result.success, false);
  });

  it('rejects an invalid week plan instead of accepting sample-shaped junk', () => {
    const result = coachChatRequestSchema.safeParse({
      messages: [],
      athlete: { name: 'Alex', raceGoalDate: '2026-10-04', raceDistance: '70.3' },
      weekPlan: { theme: 'nope' },
    });
    assert.equal(result.success, false);
  });
});
