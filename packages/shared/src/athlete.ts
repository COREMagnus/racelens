import { isIsoDate, weeksUntil } from './dates';

export const RACE_DISTANCES = ['Sprint', 'Olympic', '70.3', 'Ironman'] as const;
export type RaceDistance = (typeof RACE_DISTANCES)[number];

export const NOT_RACING = 'none' as const;
export type RaceDistanceChoice = RaceDistance | typeof NOT_RACING;

export const RACE_DISTANCE_CHOICES = [...RACE_DISTANCES, NOT_RACING] as const;

export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/** Match API coach name / note limits so the mobile form 400s locally first. */
export const MAX_DISPLAY_NAME_CHARS = 120;
export const MAX_CONSTRAINTS_CHARS = 500;
export const MAX_RACE_DATE_CHARS = 64;
export const MAX_WEEKLY_HOURS = 168;

export interface WeeklyVolume {
  totalHours?: number;
  swimHours?: number;
  bikeHours?: number;
  runHours?: number;
}

export interface AthleteProfile {
  name: string;
  raceGoalDate: string;
  raceDistance?: RaceDistanceChoice;
  weeklyVolume: WeeklyVolume;
  experienceLevel?: ExperienceLevel;
  constraints: string;
}

export interface OnboardingInput {
  name: string;
  raceDistance?: RaceDistanceChoice;
  raceGoalDate: string;
  weeklyVolume: WeeklyVolume;
  experienceLevel?: ExperienceLevel;
  constraints: string;
}

export type OnboardingErrors = Partial<Record<'name' | 'raceDistance' | 'raceGoalDate' | 'weeklyVolume' | 'constraints', string>>;

export function emptyAthleteProfile(): AthleteProfile {
  return {
    name: '',
    raceGoalDate: '',
    weeklyVolume: {},
    constraints: '',
  };
}

export function isRaceDistance(value: unknown): value is RaceDistance {
  return value === 'Sprint' || value === 'Olympic' || value === '70.3' || value === 'Ironman';
}

export function isRaceDistanceChoice(value: unknown): value is RaceDistanceChoice {
  return value === NOT_RACING || isRaceDistance(value);
}

export function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced';
}

export function isRacing(profile: Pick<AthleteProfile, 'raceDistance'>): boolean {
  return isRaceDistance(profile.raceDistance);
}

export function weeklyVolumeHours(volume: WeeklyVolume): number | undefined {
  const sportSum = sportHoursSum(volume);
  if (typeof volume.totalHours === 'number' && volume.totalHours > 0) {
    return clampHours(volume.totalHours);
  }
  if (sportSum != null && sportSum > 0) {
    return clampHours(sportSum);
  }
  return undefined;
}

export function hasWeeklyVolume(volume: WeeklyVolume): boolean {
  return weeklyVolumeHours(volume) != null;
}

export function hasRaceGoal(profile: Pick<AthleteProfile, 'raceDistance' | 'raceGoalDate'>): boolean {
  return isRaceDistance(profile.raceDistance);
}

export function hasRequiredOnboardingFields(profile: AthleteProfile): boolean {
  return Object.keys(validateOnboarding(profile)).length === 0;
}

export function validateOnboarding(input: OnboardingInput): OnboardingErrors {
  const errors: OnboardingErrors = {};
  const name = input.name.trim();
  if (!name) {
    errors.name = 'Enter a display name.';
  } else if (name.length > MAX_DISPLAY_NAME_CHARS) {
    errors.name = `Name must be ${MAX_DISPLAY_NAME_CHARS} characters or fewer.`;
  }

  if (!isRaceDistanceChoice(input.raceDistance)) {
    errors.raceDistance = 'Choose a race distance, or “not racing yet”.';
  } else if (isRaceDistance(input.raceDistance)) {
    const date = input.raceGoalDate.trim();
    if (!date) {
      errors.raceGoalDate = 'Add a goal race date (YYYY-MM-DD), or choose “not racing yet”.';
    } else if (!isIsoDate(date)) {
      errors.raceGoalDate = 'Use a real date as YYYY-MM-DD.';
    }
  }

  if (!hasWeeklyVolume(input.weeklyVolume)) {
    errors.weeklyVolume = 'Add typical weekly hours (total, or swim / bike / run).';
  } else if (volumeExceedsMax(input.weeklyVolume)) {
    errors.weeklyVolume = `Weekly hours must be ${MAX_WEEKLY_HOURS} or fewer.`;
  }

  if (input.constraints.length > MAX_CONSTRAINTS_CHARS) {
    errors.constraints = `Notes must be ${MAX_CONSTRAINTS_CHARS} characters or fewer.`;
  }

  return errors;
}

export function normalizeAthleteProfile(input: OnboardingInput): AthleteProfile {
  const name = input.name.trim().slice(0, MAX_DISPLAY_NAME_CHARS);
  const racing = isRaceDistance(input.raceDistance);
  const profile: AthleteProfile = {
    name,
    raceGoalDate: racing ? input.raceGoalDate.trim().slice(0, MAX_RACE_DATE_CHARS) : '',
    weeklyVolume: normalizeVolume(input.weeklyVolume),
    constraints: input.constraints.trim().slice(0, MAX_CONSTRAINTS_CHARS),
  };
  if (isRaceDistanceChoice(input.raceDistance)) {
    profile.raceDistance = input.raceDistance;
  }
  if (isExperienceLevel(input.experienceLevel)) {
    profile.experienceLevel = input.experienceLevel;
  }
  return profile;
}

/**
 * Read a stored JSON athlete (current or v1 name/date/distance only).
 * Missing fields stay empty — never invent a name, race, or volume.
 */
export function parseStoredAthleteProfile(raw: unknown): AthleteProfile {
  if (!raw || typeof raw !== 'object') {
    return emptyAthleteProfile();
  }
  const record = raw as Record<string, unknown>;
  const weeklyVolume = parseWeeklyVolume(record.weeklyVolume);
  const constraints = typeof record.constraints === 'string' ? record.constraints : '';
  const raceGoalDate = typeof record.raceGoalDate === 'string' ? record.raceGoalDate : '';

  const input: OnboardingInput = {
    name: typeof record.name === 'string' ? record.name : '',
    raceGoalDate,
    weeklyVolume,
    constraints,
  };
  if (isRaceDistanceChoice(record.raceDistance)) {
    input.raceDistance = record.raceDistance;
  }
  if (isExperienceLevel(record.experienceLevel)) {
    input.experienceLevel = record.experienceLevel;
  }
  return normalizeAthleteProfile(input);
}

export function raceGoalLabel(profile: Pick<AthleteProfile, 'raceDistance' | 'raceGoalDate'>, now = new Date()): string {
  if (!isRaceDistance(profile.raceDistance)) {
    return 'No race goal yet';
  }
  const date = profile.raceGoalDate.trim();
  if (!isIsoDate(date)) {
    return `${profile.raceDistance} · date unknown`;
  }
  const weeks = weeksUntil(date, now);
  if (weeks == null) {
    return `${profile.raceDistance} · ${date}`;
  }
  const weekLabel = weeks === 1 ? '1 week out' : `${weeks} weeks out`;
  return `${profile.raceDistance} · ${date} · ${weekLabel}`;
}

function parseWeeklyVolume(raw: unknown): WeeklyVolume {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  const volume: WeeklyVolume = {};
  assignHour(volume, 'totalHours', record.totalHours);
  assignHour(volume, 'swimHours', record.swimHours);
  assignHour(volume, 'bikeHours', record.bikeHours);
  assignHour(volume, 'runHours', record.runHours);
  return volume;
}

function normalizeVolume(volume: WeeklyVolume): WeeklyVolume {
  const next: WeeklyVolume = {};
  assignHour(next, 'totalHours', volume.totalHours);
  assignHour(next, 'swimHours', volume.swimHours);
  assignHour(next, 'bikeHours', volume.bikeHours);
  assignHour(next, 'runHours', volume.runHours);
  return next;
}

function assignHour(target: WeeklyVolume, key: keyof WeeklyVolume, value: unknown): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return;
  target[key] = clampHours(value);
}

function sportHoursSum(volume: WeeklyVolume): number | undefined {
  let sum = 0;
  let any = false;
  for (const value of [volume.swimHours, volume.bikeHours, volume.runHours]) {
    if (typeof value === 'number' && value > 0) {
      sum += value;
      any = true;
    }
  }
  return any ? sum : undefined;
}

function volumeExceedsMax(volume: WeeklyVolume): boolean {
  const hours = weeklyVolumeHours(volume);
  if (hours != null && hours > MAX_WEEKLY_HOURS) return true;
  const sportSum = sportHoursSum(volume);
  return sportSum != null && sportSum > MAX_WEEKLY_HOURS;
}

function clampHours(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Math.min(MAX_WEEKLY_HOURS, Math.max(0, rounded));
}
