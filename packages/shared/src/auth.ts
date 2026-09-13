import type { AthleteProfile } from './athlete';
import type { WeekPlan } from './plan';
import type { Session } from './session';

export interface AuthUserPublic {
  id: string;
  email: string;
}

export interface AthleteSnapshot {
  user: AuthUserPublic;
  profile: AthleteProfile | null;
  sessions: Session[];
  plan: WeekPlan | null;
}

export interface AuthSessionResponse extends AthleteSnapshot {
  token: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}
