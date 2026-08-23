import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

/**
 * Photo + voice capture stubs.
 *
 * Camera / ImagePicker and expo-audio (SDK 57 successor to expo-av) are wired
 * so a later pass can stream live CameraView frames and real transcription.
 * Analyze still receives a string payload — the API mock treats it as text.
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
    });
    if (picked.canceled || !picked.assets[0]) return null;
    return `photo:${picked.assets[0].uri}`;
  }

  const shot = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (shot.canceled || !shot.assets[0]) return null;
  return `photo:${shot.assets[0].uri}`;
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

export { RecordingPresets, useAudioRecorder };
