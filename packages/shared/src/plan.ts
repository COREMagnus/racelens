import type { Intensity, Sport } from './session';

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export type WeekPlanKind = 'demo' | 'starter';

export interface PlannedSession {
  id: string;
  weekday: Weekday;
  date: string;
  sport: Sport;
  title: string;
  durationMin: number;
  intensity: Intensity;
  focus: string;
  adaptiveNote?: string;
}

export interface WeekPlan {
  weekStart: string;
  theme: string;
  readinessScore?: number;
  readinessNote: string;
  sessions: PlannedSession[];
  kind?: WeekPlanKind;
}

export function isStarterWeekPlan(plan: WeekPlan): boolean {
  return plan.kind === 'starter';
}

export function isDemoWeekPlan(plan: WeekPlan): boolean {
  return !isStarterWeekPlan(plan);
}

export function planBanner(plan: WeekPlan): string {
  if (isStarterWeekPlan(plan)) {
    return plan.theme;
  }
  return 'Demo plan — not based on your goal';
}
