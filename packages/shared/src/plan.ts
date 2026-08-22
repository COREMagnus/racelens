import type { Intensity, Sport } from './session';

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

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
  readinessScore: number;
  readinessNote: string;
  sessions: PlannedSession[];
}
