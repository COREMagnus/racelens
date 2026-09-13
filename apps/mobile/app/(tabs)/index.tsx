import type { PlannedSession } from '@racelens/shared';
import {
  isDemoWeekPlan,
  planBanner,
  raceGoalLabel,
  resolveWeekPlan,
  weeklyVolumeHours,
} from '@racelens/shared';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PRODUCT_TAGLINE } from '../../src/branding';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { SportBadge } from '../../src/components/SportBadge';
import { useProfile } from '../../src/state/profile';
import { colors, spacing } from '../../src/theme';

export default function HomeScreen() {
  const { profile } = useProfile();
  const plan = useMemo(() => resolveWeekPlan(profile), [profile]);
  const today = useMemo(() => todaySessions(plan.sessions), [plan]);
  const demo = isDemoWeekPlan(plan);
  const volume = weeklyVolumeHours(profile.weeklyVolume);
  const greeting = profile.name.trim() ? `Hey ${profile.name.trim()}` : 'Hey there';

  return (
    <Screen
      title={greeting}
      subtitle={`${PRODUCT_TAGLINE}. Today's sessions come from your race goal when you have one.`}
    >
      <Card>
        <Text style={styles.sectionLabel}>Race goal</Text>
        <Text style={styles.goal}>{raceGoalLabel(profile)}</Text>
        <Text style={styles.body}>
          {volume != null
            ? `Typical week · ${volume} hours`
            : 'Typical weekly volume unknown'}
        </Text>
        {profile.experienceLevel ? (
          <Text style={styles.meta}>Experience · {profile.experienceLevel}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Readiness</Text>
        <Text style={styles.unknown}>Unknown</Text>
        <Text style={styles.body}>
          No sleep, HRV, or recovery score yet. TriAdapt will not invent one.
        </Text>
        <Text style={styles.meta}>{planBanner(plan)}</Text>
      </Card>

      <Text style={styles.listTitle}>{demo ? 'Today (demo)' : 'Today'}</Text>
      {today.length === 0 ? (
        <Card>
          <Text style={styles.body}>
            {demo
              ? 'No demo sessions dated today. The sample week is not based on your goal.'
              : 'No planned sessions for today — recovery or catch-up day.'}
          </Text>
        </Card>
      ) : (
        today.map((session) => (
          <Card key={session.id} accent={sportAccent(session)}>
            <View style={styles.row}>
              <SportBadge sport={session.sport} />
              <Text style={styles.duration}>{session.durationMin} min</Text>
            </View>
            <Text style={styles.sessionTitle}>{session.title}</Text>
            <Text style={styles.body}>{session.focus}</Text>
            {session.adaptiveNote ? (
              <Text style={styles.adaptive}>{session.adaptiveNote}</Text>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

function todaySessions(sessions: PlannedSession[]): PlannedSession[] {
  const today = new Date().toISOString().slice(0, 10);
  return sessions.filter((session) => session.date === today);
}

function sportAccent(session: PlannedSession): string {
  switch (session.sport) {
    case 'swim':
      return colors.swim;
    case 'bike':
      return colors.bike;
    case 'run':
      return colors.run;
    case 'brick':
      return colors.brick;
    case 'other':
      return colors.other;
  }
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goal: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginVertical: 6,
  },
  unknown: {
    color: colors.muted,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginVertical: 4,
  },
  body: {
    color: colors.text,
    lineHeight: 20,
  },
  meta: {
    color: colors.muted,
    marginTop: spacing.sm,
    fontSize: 13,
  },
  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  duration: {
    color: colors.muted,
    fontWeight: '600',
  },
  sessionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  adaptive: {
    color: colors.accent,
    marginTop: 8,
    fontSize: 13,
  },
});
