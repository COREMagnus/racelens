export const RACE_DISTANCES = ['Sprint', 'Olympic', '70.3', 'Ironman'] as const;
export type RaceDistance = (typeof RACE_DISTANCES)[number];

export interface AthleteProfile {
  name: string;
  raceGoalDate: string;
  raceDistance: RaceDistance;
}
