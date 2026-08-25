import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveLimits } from './env';

describe('resolveLimits', () => {
  it('uses documented defaults', () => {
    const limits = resolveLimits({});
    assert.equal(limits.jsonBodyLimit, '8mb');
    assert.equal(limits.maxPayloadChars, 6_000_000);
    assert.equal(limits.maxMediaBytes, 4 * 1024 * 1024);
    assert.equal(limits.rateLimitMax, 30);
    assert.equal(limits.maxAnalyzeTextChars, 20_000);
    assert.equal(limits.maxCoachMessages, 30);
    assert.equal(limits.maxCoachMessageChars, 8_000);
    assert.equal(limits.maxCoachContextChars, 100_000);
    assert.equal(limits.maxRecentSessions, 50);
    assert.equal(limits.maxWeekPlanSessions, 21);
    assert.equal(limits.maxSessionNotesChars, 4_000);
    assert.equal(limits.maxIdChars, 128);
    assert.equal(limits.maxNameChars, 120);
    assert.equal(limits.maxDateChars, 64);
    assert.equal(limits.maxTitleChars, 200);
    assert.equal(limits.maxThemeChars, 300);
    assert.equal(limits.maxFocusChars, 500);
    assert.equal(limits.maxNoteFieldChars, 500);
  });

  it('parses overrides', () => {
    const limits = resolveLimits({
      AI_MAX_PAYLOAD_CHARS: '1000',
      AI_MAX_MEDIA_BYTES: '2048',
      AI_RATE_LIMIT_MAX: '0',
      AI_JSON_BODY_LIMIT: '2mb',
      AI_MAX_ANALYZE_TEXT_CHARS: '100',
      AI_MAX_COACH_MESSAGES: '5',
      AI_MAX_COACH_MESSAGE_CHARS: '40',
      AI_MAX_COACH_CONTEXT_CHARS: '200',
      AI_MAX_RECENT_SESSIONS: '3',
      AI_MAX_WEEK_PLAN_SESSIONS: '2',
      AI_MAX_SESSION_NOTES_CHARS: '50',
    });
    assert.equal(limits.maxPayloadChars, 1000);
    assert.equal(limits.maxMediaBytes, 2048);
    assert.equal(limits.rateLimitMax, 0);
    assert.equal(limits.jsonBodyLimit, '2mb');
    assert.equal(limits.maxAnalyzeTextChars, 100);
    assert.equal(limits.maxCoachMessages, 5);
    assert.equal(limits.maxCoachMessageChars, 40);
    assert.equal(limits.maxCoachContextChars, 200);
    assert.equal(limits.maxRecentSessions, 3);
    assert.equal(limits.maxWeekPlanSessions, 2);
    assert.equal(limits.maxSessionNotesChars, 50);
  });
});
