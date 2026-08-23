import type { CoachMessage } from '@racelens/shared';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../src/components/PrimaryButton';
import { chatWithCoach } from '../../src/lib/api';
import { useProfile } from '../../src/state/profile';
import { colors, radius, spacing } from '../../src/theme';

export default function CoachScreen() {
  const { profile } = useProfile();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'welcome',
      role: 'coach',
      content:
        "I'm your RaceLens self-coach. Ask about today's session, fatigue, or how to adapt the week.",
      createdAt: new Date().toISOString(),
    },
  ]);

  async function send() {
    const content = input.trim();
    if (!content || sending) return;

    const athleteMessage: CoachMessage = {
      id: `local_${Date.now()}`,
      role: 'athlete',
      content,
      createdAt: new Date().toISOString(),
    };
    const next = [...messages, athleteMessage];
    setMessages(next);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const { reply } = await chatWithCoach(next, {
        ...profile,
        readinessScore: 74,
      });
      setMessages([...next, reply]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coach is unavailable');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>RACELENS</Text>
          <Text style={styles.title}>Coach</Text>
          <Text style={styles.subtitle}>Personal AI triathlon coach · mock replies for now</Text>
        </View>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.thread}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.bubble,
                message.role === 'athlete' ? styles.athlete : styles.coach,
              ]}
            >
              <Text style={styles.role}>{message.role}</Text>
              <Text style={styles.body}>{message.content}</Text>
            </View>
          ))}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about bricks, fatigue, or the week…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          <PrimaryButton
            label="Send"
            onPress={() => void send()}
            loading={sending}
            disabled={!input.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  kicker: {
    color: colors.accent,
    letterSpacing: 2.4,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4,
  },
  thread: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: 10,
  },
  bubble: {
    borderRadius: radius.md,
    padding: spacing.md,
    maxWidth: '92%',
  },
  coach: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  athlete: {
    backgroundColor: colors.surface2,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: colors.accentDim,
  },
  role: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  body: {
    color: colors.text,
    lineHeight: 21,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
  },
  composer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: 10,
  },
  input: {
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
