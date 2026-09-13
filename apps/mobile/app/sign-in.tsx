import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Card } from '../src/components/Card';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Screen } from '../src/components/Screen';
import { useAuth } from '../src/state/auth';
import { useProfile } from '../src/state/profile';
import { colors, radius, spacing } from '../src/theme';

export default function SignInScreen() {
  const { loaded: authLoaded, token, register, signIn } = useAuth();
  const { loaded: profileLoaded, hasCompletedOnboarding } = useProfile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'register'>('register');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoaded || !profileLoaded) {
    return null;
  }

  if (token && hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  if (token && !hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') {
        await register(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      title={mode === 'register' ? 'Create your account' : 'Sign in'}
      subtitle="Your profile, logged sessions, and week plan live on the server after you sign in — they survive reinstalls and new devices."
    >
      <Card>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="At least 8 characters"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={mode === 'register' ? 'Create account' : 'Sign in'}
          onPress={() => void submit()}
          loading={busy}
          disabled={!email.trim() || password.length < 8}
        />
        <PrimaryButton
          label={mode === 'register' ? 'I already have an account' : 'Create a new account'}
          tone="ghost"
          onPress={() => {
            setMode(mode === 'register' ? 'sign-in' : 'register');
            setError(null);
          }}
          style={styles.switch}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: spacing.sm,
  },
  input: {
    minHeight: 48,
    color: colors.text,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  switch: {
    marginTop: spacing.sm,
  },
});
