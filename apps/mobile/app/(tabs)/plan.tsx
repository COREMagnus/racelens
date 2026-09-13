import { isDemoWeekPlan, planBanner, raceGoalLabel, resolveWeekPlan } from '@racelens/shared';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { SportBadge } from '../../src/components/SportBadge';
import { useProfile } from '../../src/state/profile';
import { colors, spacing, sportColor } from '../../src/theme';

export default function PlanScreen() {
  const { profile } = useProfile();
  const plan = useMemo(() => resolveWeekPlan(profile), [profile]);
  const demo = isDemoWeekPlan(plan);

  return (
    <Screen title="Plan" subtitle={planBanner(plan)}>
      <Card>
        <Text style={styles.kicker}>{demo ? 'Demo plan — not based on your goal' : 'Starter week from your goal'}</Text>
        <Text style={styles.goal}>{raceGoalLabel(profile)}</Text>
        <Text style={styles.body}>{plan.readinessNote}</Text>
        <Text style={styles.meta}>Week of {plan.weekStart} · readiness unknown</Text>
      </Card>
      {plan.sessions.map((session) => (
        <Card key={session.id} accent={sportColor[session.sport]}>
          <View style={styles.row}>
            <Text style={styles.day}>{session.weekday}</Text>
            <Text style={styles.duration}>{session.durationMin} min · {session.intensity}</Text>
          </View>
          <View style={styles.row}>
            <SportBadge sport={session.sport} />
            <Text style={styles.date}>{session.date}</Text>
          </View>
          <Text style={styles.title}>{session.title}</Text>
          <Text style={styles.body}>{session.focus}</Text>
          {session.adaptiveNote ? (
            <Text style={styles.adaptive}>{session.adaptiveNote}</Text>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.accent,
    fontWeight: '700',
    marginBottom: 6,
  },
  goal: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  day: {
    color: colors.text,
    textTransform: 'capitalize',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  duration: {
    color: colors.muted,
    fontSize: 13,
  },
  date: {
    color: colors.muted,
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: spacing.xs,
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
  adaptive: {
    color: colors.accent,
    marginTop: 8,
  },
});
