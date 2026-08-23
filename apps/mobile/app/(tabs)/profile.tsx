import type { RaceDistance } from '@racelens/shared';
import { RACE_DISTANCES } from '@racelens/shared';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '../../src/components/Card';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { useProfile } from '../../src/state/profile';
import { colors, radius, spacing } from '../../src/theme';

export default function ProfileScreen() {
  const { profile, updateProfile } = useProfile();
  const [name, setName] = useState(profile.name);
  const [raceGoalDate, setRaceGoalDate] = useState(profile.raceGoalDate);
  const [raceDistance, setRaceDistance] = useState<RaceDistance>(profile.raceDistance);
  const [saved, setSaved] = useState(false);

  return (
    <Screen
      title="Profile"
      subtitle="Athlete basics used by the coach and adaptive plan. No coach dashboard in v1."
    >
      <Card>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={(value) => {
            setName(value);
            setSaved(false);
          }}
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Race goal date (YYYY-MM-DD)</Text>
        <TextInput
          value={raceGoalDate}
          onChangeText={(value) => {
            setRaceGoalDate(value);
            setSaved(false);
          }}
          style={styles.input}
          autoCapitalize="none"
          placeholder="2026-11-08"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Race distance</Text>
        <View style={styles.row}>
          {RACE_DISTANCES.map((distance) => (
            <Text
              key={distance}
              onPress={() => {
                setRaceDistance(distance);
                setSaved(false);
              }}
              style={[styles.chip, raceDistance === distance ? styles.chipActive : null]}
            >
              {distance}
            </Text>
          ))}
        </View>

        <PrimaryButton
          label={saved ? 'Saved' : 'Save profile'}
          onPress={() => {
            void updateProfile({ name: name.trim() || profile.name, raceGoalDate, raceDistance });
            setSaved(true);
          }}
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
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  chip: {
    color: colors.muted,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontWeight: '700',
  },
  chipActive: {
    color: colors.bg,
    backgroundColor: colors.accent,
  },
});
