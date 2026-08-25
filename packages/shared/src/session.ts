export const SPORTS = ['swim', 'bike', 'run', 'brick', 'other'] as const;
export type Sport = (typeof SPORTS)[number];

export const INTENSITY_ZONES = ['z1', 'z2', 'z3', 'z4', 'z5'] as const;
export type IntensityZone = (typeof INTENSITY_ZONES)[number];

export const INTENSITY_FEELS = ['easy', 'mod', 'hard'] as const;
export type IntensityFeel = (typeof INTENSITY_FEELS)[number];

export type Intensity = IntensityZone | IntensityFeel;

export type CaptureSource = 'photo' | 'voice' | 'text' | 'manual';
export type CaptureType = Exclude<CaptureSource, 'manual'>;

export interface Session {
  id: string;
  sport: Sport;
  startedAt: string;
  durationMin: number;
  intensity: Intensity;
  load: number;
  rpe: number;
  notes: string;
  source: CaptureSource;
}

export interface AnalyzeSessionRequest {
  type: CaptureType;
  payload: string;
}
