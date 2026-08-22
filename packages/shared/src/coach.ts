import type { AthleteProfile } from './athlete';

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
}

export interface CoachChatResponse {
  reply: CoachMessage;
}
