import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProfileProvider } from '../src/state/profile';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <ProfileProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ProfileProvider>
  );
}
