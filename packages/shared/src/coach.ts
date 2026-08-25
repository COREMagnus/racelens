import type { AthleteProfile } from './athlete';
import type { WeekPlan } from './plan';
import type { Session } from './session';

export type CoachRole = 'athlete' | 'coach';

export interface CoachMessage {
  id: string;
  role: CoachRole;
  content: string;
  createdAt: string;
}

export interface AthleteContext extends AthleteProfile {
  readinessScore?: number;
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
