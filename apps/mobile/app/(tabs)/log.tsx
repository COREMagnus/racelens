import type { CaptureType, Session } from '@racelens/shared';
import { useAudioRecorderState } from 'expo-audio';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '../../src/components/Card';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { SessionPreview } from '../../src/components/SessionPreview';
import { analyzeSession } from '../../src/lib/api';
import {
  captureWatchOrBoardPhoto,
  prepareVoiceRecording,
  RecordingPresets,
  useAudioRecorder,
  voicePayloadFromUri,
} from '../../src/lib/capture';
import { colors, radius, spacing } from '../../src/theme';

export default function LogScreen() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [text, setText] = useState('45 min easy bike, RPE 4, felt smooth');
  const [draft, setDraft] = useState<Session | null>(null);
  const [confirmed, setConfirmed] = useState<Session | null>(null);
  const [busy, setBusy] = useState<CaptureType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(type: CaptureType, payload: string) {
    setBusy(type);
    setError(null);
    setConfirmed(null);
    try {
      const session = await analyzeSession({ type, payload });
      setDraft(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analyze failed');
    } finally {
      setBusy(null);
    }
  }

  async function onPhoto() {
    const payload = await captureWatchOrBoardPhoto();
    if (!payload) {
      Alert.alert('Photo', 'Camera / library permission is required, or capture was cancelled.');
      return;
    }
    await submit('photo', payload);
  }

  async function onVoiceToggle() {
    if (recorderState.isRecording) {
      await recorder.stop();
      const payload = await voicePayloadFromUri(recorder.uri);
      await submit('voice', payload);
      return;
    }

    const ready = await prepareVoiceRecording();
    if (!ready) {
      Alert.alert('Voice', 'Microphone permission is required to log by voice.');
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  return (
    <Screen
      title="Log"
      subtitle="Capture a session from a watch photo, voice note, or text. AI returns a structured draft."
    >
      <View style={styles.actions}>
        <PrimaryButton
          label="Photo"
          tone="ghost"
          onPress={() => void onPhoto()}
          loading={busy === 'photo'}
          style={styles.action}
        />
        <PrimaryButton
          label={recorderState.isRecording ? 'Stop voice' : 'Voice'}
          tone="ghost"
          onPress={() => void onVoiceToggle()}
          loading={busy === 'voice'}
          style={styles.action}
        />
        <PrimaryButton
          label="Text"
          onPress={() => void submit('text', text)}
          loading={busy === 'text'}
          disabled={!text.trim()}
          style={styles.action}
        />
      </View>

      <Card>
        <Text style={styles.label}>Text capture</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder="e.g. 90 min brick, 60 bike + 20 run, moderate"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {draft ? (
        <SessionPreview
          session={draft}
          onConfirm={(session) => {
            setConfirmed(session);
            setDraft(null);
          }}
        />
      ) : null}

      {confirmed ? (
        <Card>
          <Text style={styles.confirmedTitle}>Logged</Text>
          <Text style={styles.body}>
            {confirmed.sport} · {confirmed.durationMin} min · {confirmed.intensity} · RPE{' '}
            {confirmed.rpe} · load {confirmed.load}
          </Text>
          <Text style={styles.meta}>{confirmed.notes}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  action: {
    flex: 1,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 88,
    color: colors.text,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  confirmedTitle: {
    color: colors.accent,
    fontWeight: '800',
    marginBottom: 6,
  },
  body: {
    color: colors.text,
    fontSize: 16,
  },
  meta: {
    color: colors.muted,
    marginTop: 6,
  },
});
