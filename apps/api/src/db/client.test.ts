import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { openDatabase, resolveDatabasePath } from './client';

describe('sqlite client', () => {
  it('uses memory in tests and a local file otherwise', () => {
    assert.equal(resolveDatabasePath({ NODE_ENV: 'test' }), ':memory:');
    assert.equal(resolveDatabasePath({ DATABASE_PATH: '/tmp/triadapt.sqlite' }), '/tmp/triadapt.sqlite');
    assert.match(resolveDatabasePath({ NODE_ENV: 'development' }), /triadapt\.sqlite$/);
    const db = openDatabase({ NODE_ENV: 'test', DATABASE_PATH: ':memory:' });
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get() as
      | { name: string }
      | undefined;
    assert.equal(row?.name, 'users');
    db.close();
  });
});
