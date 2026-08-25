import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveLimits } from '../lib/env';
import {
  analyzeRequestSchema,
  assertAnalyzeText,
  assertCoachContext,
  coachChatRequestSchema,
  coachContextCharCount,
  formatZodError,
} from './request-schema';

const limits = resolveLimits({});
const athlete = {
  name: 'Alex',
  raceGoalDate: '2026-10-04',
  raceDistance: '70.3' as const,
};

function message(index: number, content = 'How should I taper?') {
  return {
    id: `m${index}`,
    role: index % 2 === 0 ? ('athlete' as const) : ('coach' as const),
    content,
    createdAt: '2026-08-23T12:00:00.000Z',
  };
}

function session(index: number, notes = 'ok') {
  return {
    id: `ses_${index}`,
    sport: 'run' as const,
    startedAt: '2026-08-21T10:00:00.000Z',
    durationMin: 40,
    intensity: 'easy' as const,
    load: 24,
    rpe: 3,
    notes,
    source: 'text' as const,
  };
}

function planned(index: number) {
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  return {
    id: `plan_${index}`,
    weekday: weekdays[index % 7],
    date: '2026-08-17',
    sport: 'run' as const,
    title: 'Easy aerobic',
    durationMin: 40,
    intensity: 'easy' as const,
    focus: 'keep it conversational',
  };
}

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
      messages: [message(1)],
      athlete,
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
      athlete,
      weekPlan: { theme: 'nope' },
    });
    assert.equal(result.success, false);
  });

  it('accepts analyze text at the 20_000 character limit and rejects one over', () => {
    assert.doesNotThrow(() => assertAnalyzeText('a'.repeat(20_000), limits.maxAnalyzeTextChars));
    assert.throws(
      () => assertAnalyzeText('a'.repeat(20_001), limits.maxAnalyzeTextChars),
      /Analyze text exceeds the 20000 character limit/,
    );
  });

  it('accepts 8_000-character coach messages and rejects 8_001', () => {
    const ok = coachChatRequestSchema.safeParse({
      messages: [message(1, 'c'.repeat(8_000))],
      athlete,
    });
    const over = coachChatRequestSchema.safeParse({
      messages: [message(1, 'c'.repeat(8_001))],
      athlete,
    });
    assert.equal(ok.success, true);
    assert.equal(over.success, false);
  });

  it('accepts 30 coach messages and rejects 31', () => {
    const ok = coachChatRequestSchema.safeParse({
      messages: Array.from({ length: 30 }, (_, index) => message(index)),
      athlete,
    });
    const over = coachChatRequestSchema.safeParse({
      messages: Array.from({ length: 31 }, (_, index) => message(index)),
      athlete,
    });
    assert.equal(ok.success, true);
    assert.equal(over.success, false);
  });

  it('accepts 50 recent sessions and rejects 51', () => {
    const ok = coachChatRequestSchema.safeParse({
      messages: [message(1)],
      athlete,
      recentSessions: Array.from({ length: 50 }, (_, index) => session(index)),
    });
    const over = coachChatRequestSchema.safeParse({
      messages: [message(1)],
      athlete,
      recentSessions: Array.from({ length: 51 }, (_, index) => session(index)),
    });
    assert.equal(ok.success, true);
    assert.equal(over.success, false);
  });

  it('accepts 21 planned sessions and rejects 22', () => {
    const week = (count: number) => ({
      weekStart: '2026-08-17',
      theme: 'Build week',
      readinessScore: 70,
      readinessNote: 'Fine',
      sessions: Array.from({ length: count }, (_, index) => planned(index)),
    });
    const ok = coachChatRequestSchema.safeParse({
      messages: [message(1)],
      athlete,
      weekPlan: week(21),
    });
    const over = coachChatRequestSchema.safeParse({
      messages: [message(1)],
      athlete,
      weekPlan: week(22),
    });
    assert.equal(ok.success, true);
    assert.equal(over.success, false);
  });

  it('accepts 4_000-character session notes and rejects 4_001', () => {
    const ok = coachChatRequestSchema.safeParse({
      messages: [message(1)],
      athlete,
      recentSessions: [session(1, 'n'.repeat(4_000))],
    });
    const over = coachChatRequestSchema.safeParse({
      messages: [message(1)],
      athlete,
      recentSessions: [session(1, 'n'.repeat(4_001))],
    });
    assert.equal(ok.success, true);
    assert.equal(over.success, false);
  });

  it('rejects aggregate coach context just over the limit', () => {
    const parsed = coachChatRequestSchema.parse({
      messages: [message(1, '1234567890')],
      athlete,
    });
    const total = coachContextCharCount(parsed);
    assert.ok(total > 40);
    assert.throws(
      () => assertCoachContext(parsed, resolveLimits({ AI_MAX_COACH_CONTEXT_CHARS: String(total - 1) })),
      /Coach textual context exceeds the/,
    );
  });

  it('accepts aggregate coach context at a configured limit', () => {
    const parsed = coachChatRequestSchema.parse({
      messages: [message(1, 'short')],
      athlete,
    });
    const total = coachContextCharCount(parsed);
    assert.doesNotThrow(() =>
      assertCoachContext(parsed, resolveLimits({ AI_MAX_COACH_CONTEXT_CHARS: String(total) })),
    );
  });

  it('accepts short identifier, name, date, title, theme, focus, and note fields at their limits', () => {
    const ok = coachChatRequestSchema.safeParse({
      messages: [
        {
          id: 'i'.repeat(128),
          role: 'athlete',
          content: 'ok',
          createdAt: 'd'.repeat(64),
        },
      ],
      athlete: {
        name: 'n'.repeat(120),
        raceGoalDate: 'd'.repeat(64),
        raceDistance: '70.3',
      },
      weekPlan: {
        weekStart: 'd'.repeat(64),
        theme: 't'.repeat(300),
        readinessScore: 70,
        readinessNote: 'r'.repeat(500),
        sessions: [
          {
            id: 'i'.repeat(128),
            weekday: 'monday',
            date: 'd'.repeat(64),
            sport: 'run',
            title: 't'.repeat(200),
            durationMin: 40,
            intensity: 'easy',
            focus: 'f'.repeat(500),
            adaptiveNote: 'a'.repeat(500),
          },
        ],
      },
    });
    assert.equal(ok.success, true);
  });

  it('rejects short identifier, name, date, title, theme, focus, and note fields one character over', () => {
    const base = {
      messages: [message(1)],
      athlete,
    };
    assert.equal(
      coachChatRequestSchema.safeParse({
        ...base,
        messages: [{ ...message(1), id: 'i'.repeat(129) }],
      }).success,
      false,
    );
    assert.equal(
      coachChatRequestSchema.safeParse({
        ...base,
        athlete: { ...athlete, name: 'n'.repeat(121) },
      }).success,
      false,
    );
    assert.equal(
      coachChatRequestSchema.safeParse({
        ...base,
        athlete: { ...athlete, raceGoalDate: 'd'.repeat(65) },
      }).success,
      false,
    );
    assert.equal(
      coachChatRequestSchema.safeParse({
        ...base,
        weekPlan: {
          weekStart: '2026-08-17',
          theme: 't'.repeat(301),
          readinessScore: 70,
          readinessNote: 'Fine',
          sessions: [planned(1)],
        },
      }).success,
      false,
    );
    assert.equal(
      coachChatRequestSchema.safeParse({
        ...base,
        weekPlan: {
          weekStart: '2026-08-17',
          theme: 'Build',
          readinessScore: 70,
          readinessNote: 'r'.repeat(501),
          sessions: [planned(1)],
        },
      }).success,
      false,
    );
    assert.equal(
      coachChatRequestSchema.safeParse({
        ...base,
        weekPlan: {
          weekStart: '2026-08-17',
          theme: 'Build',
          readinessScore: 70,
          readinessNote: 'Fine',
          sessions: [{ ...planned(1), title: 't'.repeat(201) }],
        },
      }).success,
      false,
    );
    assert.equal(
      coachChatRequestSchema.safeParse({
        ...base,
        weekPlan: {
          weekStart: '2026-08-17',
          theme: 'Build',
          readinessScore: 70,
          readinessNote: 'Fine',
          sessions: [{ ...planned(1), focus: 'f'.repeat(501) }],
        },
      }).success,
      false,
    );
    assert.equal(
      coachChatRequestSchema.safeParse({
        ...base,
        weekPlan: {
          weekStart: '2026-08-17',
          theme: 'Build',
          readinessScore: 70,
          readinessNote: 'Fine',
          sessions: [{ ...planned(1), adaptiveNote: 'a'.repeat(501) }],
        },
      }).success,
      false,
    );
  });
});
