import type { WeekPlan } from '@racelens/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { SportBadge } from '../../src/components/SportBadge';
import { getWeekPlan } from '../../src/lib/api';
import { colors, spacing, sportColor } from '../../src/theme';

export default function PlanScreen() {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getWeekPlan()
      .then((week) => {
        if (!cancelled) setPlan(week);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load week');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Screen
      title="Plan"
      subtitle={plan?.theme ?? 'Adaptive week view (sample data until the coach model ships).'}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {plan ? (
        <Card>
          <Text style={styles.kicker}>Week of {plan.weekStart}</Text>
          <Text style={styles.body}>{plan.readinessNote}</Text>
        </Card>
      ) : null}
      {(plan?.sessions ?? []).map((session) => (
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
  adaptive: {
    color: colors.accent,
    marginTop: 8,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
