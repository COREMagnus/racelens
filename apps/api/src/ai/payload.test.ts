import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AiRequestError } from './errors';
import {
  classifyAnalyzePayload,
  decodeDataUri,
  estimatedDecodedBytes,
  extractTranscript,
  filenameForAudioMime,
  isValidBase64,
  splitUriAndHint,
} from './payload';

describe('classifyAnalyzePayload', () => {
  it('treats text captures as workout text', () => {
    const classified = classifyAnalyzePayload('text', '45 min easy bike, RPE 4');
    assert.deepEqual(classified, { kind: 'text', text: '45 min easy bike, RPE 4' });
  });

  it('sends data-URI photos to vision', () => {
    const payload = `data:image/jpeg;base64,${Buffer.from('tiny-image').toString('base64')}`;
    const classified = classifyAnalyzePayload('photo', payload);
    assert.equal(classified.kind, 'image');
    if (classified.kind === 'image') {
      assert.equal(classified.imageUrl, payload);
    }
  });

  it('sends https photo URLs to vision', () => {
    const classified = classifyAnalyzePayload(
      'photo',
      'https://cdn.example.com/watch.png — 50 min Z2 swim',
    );
    assert.equal(classified.kind, 'image');
    if (classified.kind === 'image') {
      assert.equal(classified.imageUrl, 'https://cdn.example.com/watch.png');
      assert.equal(classified.hint, '50 min Z2 swim');
    }
  });

  it('falls back to text when the mobile app only sent a local photo URI + description', () => {
    const classified = classifyAnalyzePayload(
      'photo',
      'photo:file:///tmp/watch.jpg — 50 min Z2 swim from watch screen',
    );
    assert.equal(classified.kind, 'text');
    if (classified.kind === 'text') {
      assert.match(classified.text, /50 min Z2 swim/);
    }
  });

  it('treats labeled voice transcripts as text', () => {
    const classified = classifyAnalyzePayload(
      'voice',
      'Voice capture file:///tmp/note.m4a. Stub transcript: 60 min tempo run, RPE 7, humid.',
    );
    assert.deepEqual(classified, {
      kind: 'text',
      text: '60 min tempo run, RPE 7, humid.',
    });
  });

  it('classifies audio data URIs for Whisper', () => {
    const payload = 'data:audio/m4a;base64,AAAA';
    const classified = classifyAnalyzePayload('voice', payload);
    assert.equal(classified.kind, 'audio');
    if (classified.kind === 'audio') {
      assert.equal(classified.source, 'data-uri');
      assert.equal(classified.mime, 'audio/m4a');
    }
  });

  it('rejects remote audio URLs with 400-style AiRequestError', () => {
    assert.throws(
      () => classifyAnalyzePayload('voice', 'https://evil.example/session.mp3'),
      (error: unknown) =>
        error instanceof AiRequestError && /Remote audio URLs are not allowed/.test(error.message),
    );
  });

  it('rejects unsupported audio MIME types before OpenAI', () => {
    assert.throws(
      () => classifyAnalyzePayload('voice', 'data:audio/exe;base64,AAAA'),
      /Unsupported audio type/,
    );
  });

  it('rejects invalid audio base64 before OpenAI', () => {
    assert.throws(
      () => classifyAnalyzePayload('voice', 'data:audio/m4a;base64,!!!!'),
      /Invalid base64/,
    );
  });

  it('rejects oversized audio without decoding the full payload', () => {
    const huge = 'A'.repeat(100);
    assert.throws(
      () =>
        classifyAnalyzePayload('voice', `data:audio/m4a;base64,${huge}`, {
          maxMediaBytes: 16,
        }),
      /exceeds the 16 byte limit/,
    );
  });

  it('rejects an empty payload', () => {
    assert.throws(() => classifyAnalyzePayload('text', '   '), AiRequestError);
  });

  it('rejects a local voice URI with no transcript', () => {
    assert.throws(
      () => classifyAnalyzePayload('voice', 'Voice capture file:///tmp/note.m4a'),
      AiRequestError,
    );
  });
});

describe('payload helpers', () => {
  it('splits a URI from an em-dash hint', () => {
    assert.deepEqual(splitUriAndHint('https://x.test/a.jpg — brick 90 min'), {
      uri: 'https://x.test/a.jpg',
      hint: 'brick 90 min',
    });
  });

  it('extracts a labeled transcript', () => {
    assert.equal(
      extractTranscript('Voice capture blob:1. transcript: easy 30 min swim'),
      'easy 30 min swim',
    );
  });

  it('decodes a data URI', () => {
    const decoded = decodeDataUri(`data:image/png;base64,${Buffer.from('hi').toString('base64')}`);
    assert.equal(decoded.mime, 'image/png');
    assert.equal(decoded.buffer.toString(), 'hi');
  });

  it('picks an audio filename from mime', () => {
    assert.equal(filenameForAudioMime('audio/mpeg'), 'audio.mp3');
    assert.equal(filenameForAudioMime('audio/webm'), 'audio.webm');
    assert.equal(filenameForAudioMime('audio/mp4'), 'audio.m4a');
  });

  it('validates base64 and estimates decoded size', () => {
    assert.equal(isValidBase64('AAAA'), true);
    assert.equal(isValidBase64('!!!'), false);
    assert.equal(estimatedDecodedBytes('AAAA'), 3);
  });
});
