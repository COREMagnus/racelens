import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, Text, type ColorValue } from 'react-native';

import { useProfile } from '../../src/state/profile';
import { colors } from '../../src/theme';

function TabGlyph({ label, color }: { label: string; color: ColorValue }) {
  return <Text style={[styles.glyph, { color }]}>{label}</Text>;
}

export default function TabsLayout() {
  const { loaded, hasCompletedOnboarding } = useProfile();
  if (loaded && !hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabGlyph label="⚡" color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color }) => <TabGlyph label="＋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <TabGlyph label="▦" color={color} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color }) => <TabGlyph label="◎" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabGlyph label="○" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  glyph: {
    fontSize: 16,
    fontWeight: '700',
  },
});
