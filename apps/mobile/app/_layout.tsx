import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PRODUCT_NAME } from '../src/branding';
import { AuthProvider, useAuth } from '../src/state/auth';
import { resolveRootRoute } from '../src/state/nav';
import { ProfileProvider, useProfile } from '../src/state/profile';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <StatusBar style="light" />
        <RootNav />
      </ProfileProvider>
    </AuthProvider>
  );
}

function RootNav() {
  const auth = useAuth();
  const profile = useProfile();
  const route = resolveRootRoute({
    authLoaded: auth.loaded,
    profileLoaded: profile.loaded,
    token: auth.token,
    hasCompletedOnboarding: profile.hasCompletedOnboarding,
  });

  if (route === 'boot') {
    return (
      <View style={styles.boot}>
        <Text style={styles.kicker}>{PRODUCT_NAME}</Text>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  kicker: {
    color: colors.accent,
    letterSpacing: 3,
    fontSize: 14,
    fontWeight: '800',
  },
});
