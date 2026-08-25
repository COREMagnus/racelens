import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PRODUCT_DESCRIPTION,
  PRODUCT_KICKER,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
} from './branding';

describe('TriAdapt branding', () => {
  it('uses TriAdapt as the canonical product name and adaptive-coach positioning', () => {
    assert.equal(PRODUCT_NAME, 'TriAdapt');
    assert.equal(PRODUCT_KICKER, 'TRIADAPT');
    assert.equal(PRODUCT_TAGLINE, 'Your adaptive AI triathlon coach');
    assert.match(PRODUCT_DESCRIPTION, /TriAdapt turns workout data/);
    assert.match(PRODUCT_DESCRIPTION, /adapts to the athlete/);
    assert.doesNotMatch(PRODUCT_NAME, /RaceLens|Trisight|TriSight/i);
    assert.doesNotMatch(PRODUCT_TAGLINE, /RaceLens|Trisight|TriSight/i);
    assert.doesNotMatch(PRODUCT_DESCRIPTION, /RaceLens|Trisight|TriSight/i);
  });
});
