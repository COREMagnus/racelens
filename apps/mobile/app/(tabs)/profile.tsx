import type { AthleteProfile } from '@racelens/shared';
import { raceGoalLabel } from '@racelens/shared';
import { StyleSheet, Text } from 'react-native';

import { AthleteProfileForm } from '../../src/components/AthleteProfileForm';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { useProfile } from '../../src/state/profile';
import { colors, spacing } from '../../src/theme';

export default function ProfileScreen() {
  const { profile, saveProfile } = useProfile();

  async function onSubmit(next: AthleteProfile) {
    await saveProfile(next);
  }

  return (
    <Screen
      title="Profile"
      subtitle="Edit your race goal and training basics. Missing fields stay unknown — TriAdapt will not invent readiness or a plan."
    >
      <Card>
        <Text style={styles.kicker}>Current goal</Text>
        <Text style={styles.goal}>{raceGoalLabel(profile)}</Text>
      </Card>
      <AthleteProfileForm initial={profile} submitLabel="Save profile" onSubmit={onSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  goal: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
});
