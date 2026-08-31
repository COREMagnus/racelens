import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PRODUCT_NAME } from '../src/branding';
import { ProfileProvider, useProfile } from '../src/state/profile';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <ProfileProvider>
      <StatusBar style="light" />
      <RootNav />
    </ProfileProvider>
  );
}

function RootNav() {
  const { loaded } = useProfile();

  if (!loaded) {
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
