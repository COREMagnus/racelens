import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_VOICE_BYTES,
  MAX_VOICE_DURATION_MS,
  VoiceCaptureError,
  mimeFromRecordingUri,
  voicePayloadFromUri,
  type VoiceFileSystem,
} from './voice-payload';

function mockFs(overrides: Partial<VoiceFileSystem> = {}): VoiceFileSystem {
  return {
    async getInfo() {
      return { exists: true, size: 128 };
    },
    async readAsBase64() {
      return Buffer.from('voice-bytes').toString('base64');
    },
    ...overrides,
  };
}

describe('voicePayloadFromUri', () => {
  it('reads a native file URI through the filesystem layer', async () => {
    let readUri = '';
    const payload = await voicePayloadFromUri('file:///tmp/note.m4a', {
      platform: 'ios',
      durationMs: 12_000,
      fs: mockFs({
        async readAsBase64(uri) {
          readUri = uri;
          return Buffer.from('ios-audio').toString('base64');
        },
      }),
    });
    assert.equal(readUri, 'file:///tmp/note.m4a');
    assert.equal(payload, `data:audio/mp4;base64,${Buffer.from('ios-audio').toString('base64')}`);
  });

  it('uses Android content URIs and mp4 mime by default', async () => {
    const payload = await voicePayloadFromUri('content://media/audio/9', {
      platform: 'android',
      fs: mockFs(),
    });
    assert.match(payload, /^data:audio\/mp4;base64,/);
  });

  it('reads web blob URIs through the injected blob reader, not file:// fetch', async () => {
    const payload = await voicePayloadFromUri('blob:http://localhost/abc', {
      platform: 'web',
      fs: mockFs({
        async readAsBase64() {
          throw new Error('native fs should not run on web');
        },
      }),
      async readWebBlob(uri) {
        assert.equal(uri, 'blob:http://localhost/abc');
        return { base64: Buffer.from('webm').toString('base64'), mime: 'audio/webm' };
      },
    });
    assert.equal(payload, `data:audio/webm;base64,${Buffer.from('webm').toString('base64')}`);
  });

  it('rejects a missing URI instead of sending a fake transcript', async () => {
    await assert.rejects(
      () => voicePayloadFromUri(null, { platform: 'ios', fs: mockFs() }),
      VoiceCaptureError,
    );
  });

  it('rejects recordings over the duration limit', async () => {
    await assert.rejects(
      () =>
        voicePayloadFromUri('file:///tmp/long.m4a', {
          platform: 'ios',
          durationMs: MAX_VOICE_DURATION_MS + 1,
          fs: mockFs(),
        }),
      /limited to 3 minutes/,
    );
  });

  it('rejects oversized files before reading bytes when size is known', async () => {
    let read = false;
    await assert.rejects(
      () =>
        voicePayloadFromUri('file:///tmp/huge.m4a', {
          platform: 'android',
          fs: mockFs({
            async getInfo() {
              return { exists: true, size: MAX_VOICE_BYTES + 10 };
            },
            async readAsBase64() {
              read = true;
              return 'AAAA';
            },
          }),
        }),
      /too large/,
    );
    assert.equal(read, false);
  });

  it('rejects remote http(s) audio on native', async () => {
    await assert.rejects(
      () =>
        voicePayloadFromUri('https://evil.example/a.mp3', {
          platform: 'ios',
          fs: mockFs(),
        }),
      /Remote audio URLs/,
    );
  });

  it('rejects web file paths instead of treating them as transcripts', async () => {
    await assert.rejects(
      () =>
        voicePayloadFromUri('file:///Users/me/clip.m4a', {
          platform: 'web',
          fs: mockFs(),
        }),
      /blob or data URI/,
    );
  });
});

describe('mimeFromRecordingUri', () => {
  it('maps extensions and platform defaults', () => {
    assert.equal(mimeFromRecordingUri('clip.webm', 'web'), 'audio/webm');
    assert.equal(mimeFromRecordingUri('clip.m4a', 'ios'), 'audio/mp4');
    assert.equal(mimeFromRecordingUri('clip.caf', 'ios'), 'audio/x-caf');
    assert.equal(mimeFromRecordingUri('unknown', 'android'), 'audio/mp4');
    assert.equal(mimeFromRecordingUri('unknown', 'web'), 'audio/webm');
  });
});
