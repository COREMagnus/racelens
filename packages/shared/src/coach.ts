import type { ExperienceLevel, RaceDistance } from './athlete';
import type { WeekPlan } from './plan';
import type { Session } from './session';

export type CoachRole = 'athlete' | 'coach';

export interface CoachMessage {
  id: string;
  role: CoachRole;
  content: string;
  createdAt: string;
}

/** Coach-facing athlete fields. Only real values — omit unknowns. */
export interface AthleteContext {
  name: string;
  raceGoalDate?: string;
  raceDistance?: RaceDistance;
  readinessScore?: number;
  weeklyVolumeHours?: number;
  experienceLevel?: ExperienceLevel;
  constraints?: string;
}

export interface CoachChatRequest {
  messages: CoachMessage[];
  athlete: AthleteContext;
  recentSessions?: Session[];
  weekPlan?: WeekPlan;
}

export interface CoachChatResponse {
  reply: CoachMessage;
}
