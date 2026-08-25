import type { PlannedSession, WeekPlan } from '@racelens/shared';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PRODUCT_TAGLINE } from '../../src/branding';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { SportBadge } from '../../src/components/SportBadge';
import { API_URL, getWeekPlan } from '../../src/lib/api';
import { useProfile } from '../../src/state/profile';
import { colors, spacing } from '../../src/theme';

export default function HomeScreen() {
  const { profile } = useProfile();
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getWeekPlan()
      .then((week) => {
        if (!cancelled) {
          setPlan(week);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load plan');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = useMemo(() => todaySessions(plan), [plan]);

  return (
    <Screen
      title={`Hey ${profile.name}`}
      subtitle={`${PRODUCT_TAGLINE}. Today's sessions and a demo readiness snapshot. Sample plan is not used by Coach.`}
    >
      <Card>
        <Text style={styles.sectionLabel}>Readiness (demo)</Text>
        <Text style={styles.readiness}>
          {plan ? `${plan.readinessScore}` : '—'}
          <Text style={styles.readinessUnit}> / 100</Text>
        </Text>
        <Text style={styles.body}>
          {plan?.readinessNote ?? 'Start the API to load the adaptive week stub.'}
        </Text>
        <Text style={styles.meta}>
          Goal · {profile.raceDistance} · {profile.raceGoalDate}
        </Text>
      </Card>

      <Text style={styles.listTitle}>Today</Text>
      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.meta}>API {API_URL}</Text>
        </Card>
      ) : null}
      {today.length === 0 && !error ? (
        <Card>
          <Text style={styles.body}>No planned sessions for today — recovery or catch-up day.</Text>
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

function todaySessions(plan: WeekPlan | null): PlannedSession[] {
  if (!plan) return [];
  const today = new Date().toISOString().slice(0, 10);
  return plan.sessions.filter((session) => session.date === today);
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
  readiness: {
    color: colors.accent,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginVertical: 4,
  },
  readinessUnit: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '600',
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
  error: {
    color: colors.danger,
  },
});
