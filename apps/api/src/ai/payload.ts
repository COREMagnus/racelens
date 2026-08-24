import type { CaptureType } from '@racelens/shared';

import { DEFAULT_MAX_MEDIA_BYTES, DEFAULT_MAX_PAYLOAD_CHARS } from '../lib/env';
import { AiRequestError } from './errors';

export type ImageRef = { kind: 'image'; imageUrl: string; hint: string };
export type AudioRef = {
  kind: 'audio';
  source: 'data-uri';
  dataUri: string;
  mime: string;
};
export type TextRef = { kind: 'text'; text: string };
export type ClassifiedPayload = ImageRef | AudioRef | TextRef;

export const SUPPORTED_AUDIO_MIMES = [
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/aac',
  'audio/caf',
  'audio/x-caf',
] as const;

const IMAGE_DATA_URI = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/i;
const AUDIO_DATA_URI = /^data:(audio\/[a-zA-Z0-9.+-]+);base64,/i;
const HTTP_URL = /^https?:\/\//i;
const PHOTO_PREFIX = /^photo:\s*/i;
const RAW_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function classifyAnalyzePayload(
  type: CaptureType,
  payload: string,
  limits: { maxPayloadChars?: number; maxMediaBytes?: number } = {},
): ClassifiedPayload {
  const maxPayloadChars = limits.maxPayloadChars ?? DEFAULT_MAX_PAYLOAD_CHARS;
  const maxMediaBytes = limits.maxMediaBytes ?? DEFAULT_MAX_MEDIA_BYTES;
  const trimmed = payload.trim();
  if (!trimmed) {
    throw new AiRequestError('payload must be a non-empty string');
  }
  if (trimmed.length > maxPayloadChars) {
    throw new AiRequestError(
      `Analyze payload exceeds the ${maxPayloadChars} character limit.`,
    );
  }

  if (type === 'photo') {
    return classifyPhoto(trimmed, maxMediaBytes);
  }
  if (type === 'voice') {
    return classifyVoice(trimmed, maxMediaBytes);
  }
  return { kind: 'text', text: trimmed };
}

function classifyPhoto(payload: string, maxMediaBytes: number): ClassifiedPayload {
  const withoutPrefix = payload.replace(PHOTO_PREFIX, '').trim();
  const { uri, hint } = splitUriAndHint(withoutPrefix);

  const imageData = uri.match(IMAGE_DATA_URI);
  if (imageData) {
    assertValidDataUri(uri, imageData[1] ?? 'image/jpeg', maxMediaBytes, 'image');
    return { kind: 'image', imageUrl: uri, hint };
  }
  if (HTTP_URL.test(uri)) {
    return { kind: 'image', imageUrl: uri, hint };
  }
  if (isRawBase64Image(uri)) {
    const dataUri = `data:image/jpeg;base64,${uri.replace(/\s+/g, '')}`;
    assertValidDataUri(dataUri, 'image/jpeg', maxMediaBytes, 'image');
    return { kind: 'image', imageUrl: dataUri, hint };
  }
  if (hint) {
    return {
      kind: 'text',
      text: `Photo capture (image bytes not sent to the API). Description: ${hint}`,
    };
  }
  throw new AiRequestError(
    'Photo payload must be a data URI, image URL, base64 image, or include a text description the model can read.',
  );
}

function classifyVoice(payload: string, maxMediaBytes: number): ClassifiedPayload {
  if (HTTP_URL.test(payload)) {
    throw new AiRequestError(
      'Remote audio URLs are not allowed. Send a transcript or an audio data URI.',
    );
  }

  const audioData = payload.match(AUDIO_DATA_URI);
  if (audioData) {
    const mime = (audioData[1] ?? 'audio/m4a').toLowerCase();
    if (!isSupportedAudioMime(mime)) {
      throw new AiRequestError(
        `Unsupported audio type "${mime}". Send m4a, mp4, mp3, wav, webm, ogg, aac, or caf.`,
      );
    }
    assertValidDataUri(payload, mime, maxMediaBytes, 'audio');
    return { kind: 'audio', source: 'data-uri', dataUri: payload, mime };
  }

  const transcript = extractTranscript(payload);
  if (transcript) {
    return { kind: 'text', text: transcript };
  }

  throw new AiRequestError(
    'Voice payload must be a transcript or an audio data URI. Remote audio URLs are not allowed.',
  );
}

export function splitUriAndHint(value: string): { uri: string; hint: string } {
  const emDash = value.match(/^(.*?)(?:\s+[—–-]\s+)(.+)$/s);
  if (emDash && looksLikeUri(emDash[1] ?? '')) {
    return { uri: (emDash[1] ?? '').trim(), hint: (emDash[2] ?? '').trim() };
  }
  return { uri: value, hint: '' };
}

export function extractTranscript(payload: string): string {
  const labeled = payload.match(/\b(?:stub\s+)?transcript:\s*([\s\S]+)/i);
  if (labeled?.[1]?.trim()) {
    return labeled[1].trim();
  }

  const stripped = payload
    .replace(/^voice capture\s+\S+\.\s*/i, '')
    .trim();

  if (isLikelyFileUri(payload) && !hasWorkoutSignal(stripped)) {
    return '';
  }
  return stripped || payload;
}

export function decodeDataUri(dataUri: string): { mime: string; buffer: Buffer } {
  const match = dataUri.match(/^data:([^;,]+);base64,([\s\S]+)$/i);
  if (!match) {
    throw new AiRequestError('Invalid data URI; expected data:<mime>;base64,<bytes>.');
  }
  const base64 = (match[2] ?? '').replace(/\s+/g, '');
  if (!isValidBase64(base64)) {
    throw new AiRequestError('Invalid base64 in data URI.');
  }
  return {
    mime: match[1] ?? 'application/octet-stream',
    buffer: Buffer.from(base64, 'base64'),
  };
}

export function filenameForAudioMime(mime: string): string {
  const normalized = mime.toLowerCase();
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'audio.mp3';
  if (normalized.includes('wav')) return 'audio.wav';
  if (normalized.includes('webm')) return 'audio.webm';
  if (normalized.includes('ogg')) return 'audio.ogg';
  if (normalized.includes('aac')) return 'audio.aac';
  if (normalized.includes('caf')) return 'audio.caf';
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'audio.m4a';
  return 'audio.m4a';
}

export function isSupportedAudioMime(mime: string): boolean {
  return (SUPPORTED_AUDIO_MIMES as readonly string[]).includes(mime.toLowerCase());
}

export function estimatedDecodedBytes(base64: string): number {
  const compact = base64.replace(/\s+/g, '');
  const padding = compact.endsWith('==') ? 2 : compact.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((compact.length * 3) / 4) - padding);
}

export function isValidBase64(value: string): boolean {
  const compact = value.replace(/\s+/g, '');
  if (compact.length === 0 || compact.length % 4 !== 0) return false;
  return RAW_BASE64.test(compact);
}

function assertValidDataUri(
  dataUri: string,
  mime: string,
  maxMediaBytes: number,
  kind: 'audio' | 'image',
): void {
  const match = dataUri.match(/^data:[^;,]+;base64,([\s\S]+)$/i);
  const base64 = (match?.[1] ?? '').replace(/\s+/g, '');
  if (!isValidBase64(base64)) {
    throw new AiRequestError(`Invalid base64 in ${kind} data URI.`);
  }
  const estimated = estimatedDecodedBytes(base64);
  if (estimated > maxMediaBytes) {
    throw new AiRequestError(
      `${kind === 'audio' ? 'Audio' : 'Image'} exceeds the ${maxMediaBytes} byte limit.`,
    );
  }
  if (kind === 'audio' && !isSupportedAudioMime(mime)) {
    throw new AiRequestError(`Unsupported audio type "${mime}".`);
  }
}

function looksLikeUri(value: string): boolean {
  return (
    /^(data:|https?:|file:|content:|blob:|ph:|photo:|\/)/i.test(value) ||
    value.includes('://')
  );
}

function isLikelyFileUri(value: string): boolean {
  return /^(file:|content:|blob:|ph:)/i.test(value.trim()) || /\bfile:\/\//i.test(value);
}

function hasWorkoutSignal(text: string): boolean {
  return /\b(swim|bike|run|brick|min|minute|hour|rpe|z[1-5]|easy|mod|hard|tempo|ftp|km|mile)\b/i.test(
    text,
  );
}

function isRawBase64Image(value: string): boolean {
  const compact = value.replace(/\s+/g, '');
  return compact.length >= 128 && isValidBase64(compact) && !compact.includes('://');
}
