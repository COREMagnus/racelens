import type { PlannedSession, WeekPlan, Weekday } from '@racelens/shared';

/**
 * Demo-only sample week for the Plan / Home screens.
 * Never pass this into /coach/chat. Coach must only see a week plan the
 * client actually provided.
 *
 * TODO(ai): Generate this week from race goal, recent load, and readiness
 * instead of the static sample below.
 */
export function sampleWeekPlan(now = new Date()): WeekPlan {
  const weekStart = startOfWeekMonday(now);
  const sessions: PlannedSession[] = [
    session(weekStart, 'monday', 'swim', 'Technique + easy aerobic', 45, 'z2', 'Catch-up drill, then 20 min continuous'),
    session(weekStart, 'tuesday', 'bike', 'Sweet-spot intervals', 60, 'z4', '3 x 8 min @ sweet spot / 4 min easy', 'If legs feel heavy, cut to 2 intervals.'),
    session(weekStart, 'wednesday', 'run', 'Easy aerobic', 40, 'easy', 'Conversational pace, strides optional'),
    session(weekStart, 'thursday', 'swim', 'Threshold 100s', 50, 'z3', '8 x 100 at CSS + 10s rest'),
    session(weekStart, 'friday', 'bike', 'Endurance ride', 75, 'z2', 'Steady cadence, practice race bottles'),
    session(weekStart, 'saturday', 'brick', 'Bike-run brick', 90, 'mod', '60 min ride + 20 min off-bike run', 'Shorten the run if RPE > 7.'),
    session(weekStart, 'sunday', 'run', 'Long run', 70, 'z2', 'Even effort, walk breaks ok in last 15'),
  ];

  return {
    weekStart: toDateString(weekStart),
    theme: 'Sample demo week — aerobic base with one quality session per sport (not used by Coach)',
    readinessScore: 74,
    readinessNote: 'Demo data only — not real sleep, HRV, or readiness. Coach never sees this sample week.',
    sessions,
  };
}

function session(
  weekStart: Date,
  weekday: Weekday,
  sport: PlannedSession['sport'],
  title: string,
  durationMin: number,
  intensity: PlannedSession['intensity'],
  focus: string,
  adaptiveNote?: string,
): PlannedSession {
  return {
    id: `plan_${weekday}_${sport}`,
    weekday,
    date: toDateString(addDays(weekStart, weekdayOffset(weekday))),
    sport,
    title,
    durationMin,
    intensity,
    focus,
    ...(adaptiveNote !== undefined ? { adaptiveNote } : {}),
  };
}

function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekdayOffset(weekday: Weekday): number {
  const order: Weekday[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];
  return order.indexOf(weekday);
}
