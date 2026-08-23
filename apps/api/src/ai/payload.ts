import type { CaptureType } from '@racelens/shared';

import { AiRequestError } from './errors';

export type ImageRef = { kind: 'image'; imageUrl: string; hint: string };
export type AudioRef = {
  kind: 'audio';
  source: 'data-uri' | 'url';
  dataUri?: string;
  url?: string;
  mime: string;
};
export type TextRef = { kind: 'text'; text: string };
export type ClassifiedPayload = ImageRef | AudioRef | TextRef;

const IMAGE_DATA_URI = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i;
const AUDIO_DATA_URI = /^data:audio\/[a-zA-Z0-9.+-]+;base64,/i;
const HTTP_URL = /^https?:\/\//i;
const AUDIO_URL_EXT = /\.(m4a|mp3|wav|webm|ogg|mp4|aac|caf)(\?|#|$)/i;
const PHOTO_PREFIX = /^photo:\s*/i;
const RAW_BASE64 = /^[A-Za-z0-9+/=\s]+$/;

export function classifyAnalyzePayload(type: CaptureType, payload: string): ClassifiedPayload {
  const trimmed = payload.trim();
  if (!trimmed) {
    throw new AiRequestError('payload must be a non-empty string');
  }

  if (type === 'photo') {
    return classifyPhoto(trimmed);
  }
  if (type === 'voice') {
    return classifyVoice(trimmed);
  }
  return { kind: 'text', text: trimmed };
}

function classifyPhoto(payload: string): ClassifiedPayload {
  const withoutPrefix = payload.replace(PHOTO_PREFIX, '').trim();
  const { uri, hint } = splitUriAndHint(withoutPrefix);

  if (IMAGE_DATA_URI.test(uri)) {
    return { kind: 'image', imageUrl: uri, hint };
  }
  if (HTTP_URL.test(uri)) {
    return { kind: 'image', imageUrl: uri, hint };
  }
  if (isRawBase64Image(uri)) {
    return { kind: 'image', imageUrl: `data:image/jpeg;base64,${uri.replace(/\s+/g, '')}`, hint };
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

function classifyVoice(payload: string): ClassifiedPayload {
  if (AUDIO_DATA_URI.test(payload)) {
    const mime = payload.slice('data:'.length, payload.indexOf(';')) || 'audio/m4a';
    return { kind: 'audio', source: 'data-uri', dataUri: payload, mime };
  }
  if (HTTP_URL.test(payload) && AUDIO_URL_EXT.test(payload)) {
    return { kind: 'audio', source: 'url', url: payload, mime: mimeFromAudioUrl(payload) };
  }

  const transcript = extractTranscript(payload);
  if (transcript) {
    return { kind: 'text', text: transcript };
  }

  throw new AiRequestError(
    'Voice payload must be a transcript, an audio data URI, or an audio URL.',
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
  return {
    mime: match[1] ?? 'application/octet-stream',
    buffer: Buffer.from((match[2] ?? '').replace(/\s+/g, ''), 'base64'),
  };
}

export function filenameForAudioMime(mime: string): string {
  const normalized = mime.toLowerCase();
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'audio.mp3';
  if (normalized.includes('wav')) return 'audio.wav';
  if (normalized.includes('webm')) return 'audio.webm';
  if (normalized.includes('ogg')) return 'audio.ogg';
  if (normalized.includes('aac')) return 'audio.aac';
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'audio.m4a';
  return 'audio.m4a';
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
  return compact.length >= 128 && RAW_BASE64.test(compact) && !compact.includes('://');
}

function mimeFromAudioUrl(url: string): string {
  if (/\.mp3(\?|#|$)/i.test(url)) return 'audio/mpeg';
  if (/\.wav(\?|#|$)/i.test(url)) return 'audio/wav';
  if (/\.webm(\?|#|$)/i.test(url)) return 'audio/webm';
  if (/\.ogg(\?|#|$)/i.test(url)) return 'audio/ogg';
  return 'audio/m4a';
}
