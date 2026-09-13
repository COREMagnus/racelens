import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { daysUntil, isIsoDate, weeksUntil } from './dates';

describe('dates', () => {
  it('accepts real YYYY-MM-DD values and rejects impossible days', () => {
    assert.equal(isIsoDate('2026-11-08'), true);
    assert.equal(isIsoDate('2026-02-31'), false);
    assert.equal(isIsoDate('11/08/2026'), false);
    assert.equal(isIsoDate(''), false);
  });

  it('computes days and weeks until a goal without inventing a date', () => {
    const now = new Date('2026-08-23T00:00:00.000Z');
    assert.equal(daysUntil('2026-10-04', now), 42);
    assert.equal(weeksUntil('2026-10-04', now), 6);
    assert.equal(daysUntil('not-a-date', now), null);
    assert.equal(weeksUntil('not-a-date', now), null);
  });
});
