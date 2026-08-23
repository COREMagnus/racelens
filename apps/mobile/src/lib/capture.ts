import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

/**
 * Photo + voice capture.
 *
 * Analyze still receives a string payload:
 * - photo: data URI (preferred), http(s) URL, or `photo:<uri> — description`
 * - voice: audio data URI when the recording can be read; otherwise transcript text
 * - text: natural language
 */

export async function captureWatchOrBoardPhoto(): Promise<string | null> {
  const camera = await ImagePicker.requestCameraPermissionsAsync();
  if (!camera.granted) {
    const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!library.granted) {
      return null;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (picked.canceled || !picked.assets[0]) return null;
    return toImagePayload(picked.assets[0]);
  }

  const shot = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    base64: true,
  });
  if (shot.canceled || !shot.assets[0]) return null;
  return toImagePayload(shot.assets[0]);
}

function toImagePayload(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.base64) {
    const mime = asset.mimeType ?? 'image/jpeg';
    return `data:${mime};base64,${asset.base64}`;
  }
  return asset.uri;
}

/** Reserved for a dedicated live CameraView screen. */
export async function ensureCameraPermission(): Promise<boolean> {
  const existing = await Camera.getCameraPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Camera.requestCameraPermissionsAsync();
  return requested.granted;
}

export async function prepareVoiceRecording(): Promise<boolean> {
  const permission = await AudioModule.requestRecordingPermissionsAsync();
  if (!permission.granted) return false;
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
  });
  return true;
}

/** Prefer a data URI so the API can run Whisper; fall back to the raw URI. */
export async function voicePayloadFromUri(uri: string | null): Promise<string> {
  if (!uri) {
    return 'Voice capture with no URI. Transcript unavailable.';
  }
  if (uri.startsWith('data:')) {
    return uri;
  }
  const asData = await uriToDataUri(uri, 'audio/m4a');
  return asData ?? `Voice capture ${uri}`;
}

async function uriToDataUri(uri: string, mime: string): Promise<string | null> {
  try {
    const response = await fetch(uri);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || mime;
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export { RecordingPresets, useAudioRecorder };
