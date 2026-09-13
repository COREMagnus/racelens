import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { ApiError, getAuthToken, getMe, isUnauthorized, setAuthToken } from './api';

describe('API auth header', () => {
  afterEach(() => {
    setAuthToken(null);
  });

  it('sends a bearer token and parses API errors', async () => {
    setAuthToken('device-token');
    assert.equal(getAuthToken(), 'device-token');

    const originalFetch = globalThis.fetch;
    const calls: { url: string; headers: HeadersInit | undefined }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), headers: init?.headers });
      return new Response(JSON.stringify({ error: 'Sign in required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      await getMe();
      assert.fail('expected getMe to throw');
    } catch (error) {
      assert.equal(error instanceof ApiError, true);
      assert.equal(isUnauthorized(error), true);
      assert.equal((error as ApiError).message, 'Sign in required.');
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.equal(calls.length, 1);
    const headers = calls[0]?.headers as Record<string, string>;
    assert.equal(headers.Authorization, 'Bearer device-token');
    assert.match(calls[0]?.url ?? '', /\/me$/);
  });
});
