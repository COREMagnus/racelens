export const MAX_VOICE_DURATION_MS = 3 * 60 * 1000;
export const MAX_VOICE_BYTES = 4 * 1024 * 1024;

export class VoiceCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceCaptureError';
  }
}

export interface VoiceFileInfo {
  exists: boolean;
  size?: number;
}

export interface VoiceFileSystem {
  getInfo(uri: string): Promise<VoiceFileInfo>;
  readAsBase64(uri: string): Promise<string>;
}

export interface VoicePayloadOptions {
  platform: 'ios' | 'android' | 'web';
  durationMs?: number;
  fs: VoiceFileSystem;
  readWebBlob?: (uri: string) => Promise<{ base64: string; mime: string }>;
  maxDurationMs?: number;
  maxBytes?: number;
}

export function mimeFromRecordingUri(uri: string, platform: VoicePayloadOptions['platform']): string {
  const path = uri.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.webm')) return 'audio/webm';
  if (path.endsWith('.wav')) return 'audio/wav';
  if (path.endsWith('.mp3')) return 'audio/mpeg';
  if (path.endsWith('.caf')) return 'audio/x-caf';
  if (path.endsWith('.m4a') || path.endsWith('.mp4')) return 'audio/mp4';
  if (platform === 'web') return 'audio/webm';
  return 'audio/mp4';
}

export async function voicePayloadFromUri(
  uri: string | null,
  options: VoicePayloadOptions,
): Promise<string> {
  const maxDurationMs = options.maxDurationMs ?? MAX_VOICE_DURATION_MS;
  const maxBytes = options.maxBytes ?? MAX_VOICE_BYTES;

  if (options.durationMs != null && options.durationMs > maxDurationMs) {
    throw new VoiceCaptureError(
      `Voice notes are limited to ${Math.round(maxDurationMs / 60000)} minutes. Record a shorter clip or log the session as text.`,
    );
  }

  if (!uri) {
    throw new VoiceCaptureError('No recording was saved. Try again or log the session as text.');
  }

  if (uri.startsWith('data:audio/')) {
    return uri;
  }

  if (options.platform === 'web') {
    return readWebVoice(uri, options, maxBytes);
  }

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    throw new VoiceCaptureError(
      'Remote audio URLs cannot be uploaded. Record in the app or log the session as text.',
    );
  }

  return readNativeVoice(uri, options, maxBytes);
}

async function readWebVoice(
  uri: string,
  options: VoicePayloadOptions,
  maxBytes: number,
): Promise<string> {
  if (!uri.startsWith('blob:') && !uri.startsWith('data:')) {
    throw new VoiceCaptureError(
      'Web voice capture needs a blob or data URI. File paths are not supported in the browser.',
    );
  }
  if (!options.readWebBlob) {
    throw new VoiceCaptureError('Web voice capture is not available in this environment.');
  }
  const { base64, mime } = await options.readWebBlob(uri);
  assertDecodedSize(base64, maxBytes);
  return `data:${mime};base64,${base64}`;
}

async function readNativeVoice(
  uri: string,
  options: VoicePayloadOptions,
  maxBytes: number,
): Promise<string> {
  const info = await options.fs.getInfo(uri);
  if (!info.exists) {
    throw new VoiceCaptureError('The recording file is missing. Try again or log the session as text.');
  }
  if (typeof info.size === 'number' && info.size > maxBytes) {
    throw new VoiceCaptureError(
      `That recording is too large (${info.size} bytes). Keep clips under ${Math.round(maxBytes / (1024 * 1024))} MB or log as text.`,
    );
  }

  const base64 = await options.fs.readAsBase64(uri);
  assertDecodedSize(base64, maxBytes);
  const mime = mimeFromRecordingUri(uri, options.platform);
  return `data:${mime};base64,${base64}`;
}

function assertDecodedSize(base64: string, maxBytes: number): void {
  const compact = base64.replace(/\s+/g, '');
  const padding = compact.endsWith('==') ? 2 : compact.endsWith('=') ? 1 : 0;
  const bytes = Math.max(0, Math.floor((compact.length * 3) / 4) - padding);
  if (bytes > maxBytes) {
    throw new VoiceCaptureError(
      `That recording is too large. Keep clips under ${Math.round(maxBytes / (1024 * 1024))} MB or log as text.`,
    );
  }
}
