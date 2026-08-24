import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { Camera } from 'expo-camera';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import {
  voicePayloadFromUri as encodeVoicePayload,
  type VoiceFileSystem,
  type VoicePayloadOptions,
} from './voice-payload';

export { VoiceCaptureError } from './voice-payload';

/**
 * Photo + voice capture for Trisight.
 *
 * Analyze receives a string payload:
 * - photo: data URI (preferred) or a local fallback URI
 * - voice: audio data URI read through Expo FileSystem (native) or a blob reader (web)
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

export const expoVoiceFileSystem: VoiceFileSystem = {
  async getInfo(uri) {
    const file = new File(uri);
    return {
      exists: file.exists,
      ...(typeof file.size === 'number' ? { size: file.size } : {}),
    };
  },
  async readAsBase64(uri) {
    const file = new File(uri);
    return file.base64();
  },
};

export async function readWebBlobAsBase64(
  uri: string,
): Promise<{ base64: string; mime: string }> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Could not read the browser recording.');
  }
  const buffer = await response.arrayBuffer();
  const mime = response.headers.get('content-type')?.split(';')[0]?.trim() || 'audio/webm';
  return { base64: arrayBufferToBase64(buffer), mime };
}

export async function voicePayloadFromUri(
  uri: string | null,
  extras: { durationMs?: number } = {},
): Promise<string> {
  const platform = Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web'
    ? Platform.OS
    : 'android';

  const options: VoicePayloadOptions = {
    platform,
    fs: expoVoiceFileSystem,
    ...(extras.durationMs != null ? { durationMs: extras.durationMs } : {}),
    ...(platform === 'web' ? { readWebBlob: readWebBlobAsBase64 } : {}),
  };

  return encodeVoicePayload(uri, options);
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
