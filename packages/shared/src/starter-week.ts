import type { AthleteProfile, ExperienceLevel, RaceDistance, WeeklyVolume } from './athlete';
import { hasRaceGoal, hasWeeklyVolume, isRaceDistance, weeklyVolumeHours } from './athlete';
import { addDays, startOfWeekMonday, toDateString, weeksUntil } from './dates';
import type { Intensity, Sport } from './session';
import type { PlannedSession, Weekday, WeekPlan } from './plan';

/**
 * Demo-only sample week for Home / Plan when the athlete has no race goal + volume.
 * Never pass this into /coach/chat as weekPlan.
 */
export function sampleWeekPlan(now = new Date()): WeekPlan {
  const weekStart = startOfWeekMonday(now);
  const sessions: PlannedSession[] = [
    demoSession(weekStart, 'monday', 'swim', 'Technique + easy aerobic', 45, 'z2', 'Catch-up drill, then 20 min continuous'),
    demoSession(weekStart, 'tuesday', 'bike', 'Sweet-spot intervals', 60, 'z4', '3 x 8 min @ sweet spot / 4 min easy', 'If legs feel heavy, cut to 2 intervals.'),
    demoSession(weekStart, 'wednesday', 'run', 'Easy aerobic', 40, 'easy', 'Conversational pace, strides optional'),
    demoSession(weekStart, 'thursday', 'swim', 'Threshold 100s', 50, 'z3', '8 x 100 at CSS + 10s rest'),
    demoSession(weekStart, 'friday', 'bike', 'Endurance ride', 75, 'z2', 'Steady cadence, practice race bottles'),
    demoSession(weekStart, 'saturday', 'brick', 'Bike-run brick', 90, 'mod', '60 min ride + 20 min off-bike run', 'Shorten the run if RPE > 7.'),
    demoSession(weekStart, 'sunday', 'run', 'Long run', 70, 'z2', 'Even effort, walk breaks ok in last 15'),
  ];

  return {
    weekStart: toDateString(weekStart),
    theme: 'Sample demo week — aerobic base with one quality session per sport (not used by Coach)',
    readinessScore: 74,
    readinessNote: 'Demo data only — not real sleep, HRV, or readiness. Coach never sees this sample week.',
    sessions,
    kind: 'demo',
  };
}

export function canGenerateStarterWeek(profile: AthleteProfile): boolean {
  return hasRaceGoal(profile) && hasWeeklyVolume(profile.weeklyVolume);
}

/** Labeled starter week from race goal + typical volume. No readiness / HRV / sleep. */
export function generateStarterWeek(profile: AthleteProfile, now = new Date()): WeekPlan | null {
  if (!canGenerateStarterWeek(profile) || !isRaceDistance(profile.raceDistance)) {
    return null;
  }

  const hours = weeklyVolumeHours(profile.weeklyVolume);
  if (hours == null) return null;

  const distance = profile.raceDistance;
  const weeksOut = profile.raceGoalDate ? weeksUntil(profile.raceGoalDate, now) : null;
  const scaledHours = applyPhase(hours, weeksOut);
  const split = splitVolume(profile.weeklyVolume, scaledHours);
  const weekStart = startOfWeekMonday(now);
  const experience = profile.experienceLevel;
  const sessions = buildSessions(weekStart, distance, split, experience, weeksOut);

  const weekLabel =
    weeksOut == null
      ? `${distance} · date unknown`
      : weeksOut === 1
        ? `${distance} · 1 week out`
        : `${distance} · ${weeksOut} weeks out`;

  return {
    weekStart: toDateString(weekStart),
    theme: `Starter week · ${weekLabel}`,
    readinessNote:
      'Starter week from your race goal and typical weekly volume. Readiness unknown — not from sleep or HRV.',
    sessions,
    kind: 'starter',
  };
}

export function resolveWeekPlan(profile: AthleteProfile, now = new Date()): WeekPlan {
  return generateStarterWeek(profile, now) ?? sampleWeekPlan(now);
}

function applyPhase(hours: number, weeksOut: number | null): number {
  if (weeksOut == null) return hours;
  if (weeksOut <= 2) return Math.max(3, hours * 0.5);
  if (weeksOut <= 4) return Math.max(4, hours * 0.75);
  return hours;
}

function splitVolume(
  volume: WeeklyVolume,
  totalHours: number,
): { swim: number; bike: number; run: number } {
  const swim = volume.swimHours;
  const bike = volume.bikeHours;
  const run = volume.runHours;
  const specified = [swim, bike, run].filter((value): value is number => typeof value === 'number' && value > 0);
  if (specified.length > 0) {
    const sum = specified.reduce((acc, value) => acc + value, 0);
    const scale = sum > 0 ? totalHours / sum : 1;
    return {
      swim: ((swim ?? 0) * scale) || totalHours * 0.2,
      bike: ((bike ?? 0) * scale) || totalHours * 0.5,
      run: ((run ?? 0) * scale) || totalHours * 0.3,
    };
  }
  return {
    swim: totalHours * 0.2,
    bike: totalHours * 0.5,
    run: totalHours * 0.3,
  };
}

interface SessionTemplate {
  weekday: Weekday;
  sport: Sport;
  title: string;
  intensity: Intensity;
  focus: string;
  bucket: 'swim' | 'bike' | 'run';
  share: number;
  brickRunShare?: number;
}

function buildSessions(
  weekStart: Date,
  distance: RaceDistance,
  split: { swim: number; bike: number; run: number },
  experience: ExperienceLevel | undefined,
  weeksOut: number | null,
): PlannedSession[] {
  const quality = qualityIntensity(experience);
  const templates = templatesFor(distance, quality, weeksOut);
  const totalMin = {
    swim: Math.round(split.swim * 60),
    bike: Math.round(split.bike * 60),
    run: Math.round(split.run * 60),
  };
  const caps = durationCaps(distance);

  return templates.map((template) => {
    let durationMin = snap(totalMin[template.bucket] * template.share);
    if (template.sport === 'brick') {
      const bikeMin = snap(totalMin.bike * template.share);
      const runMin = snap(totalMin.run * (template.brickRunShare ?? 0.25));
      durationMin = bikeMin + runMin;
    }
    durationMin = Math.max(20, Math.min(caps[template.sport], durationMin));

    const session: PlannedSession = {
      id: `starter_${template.weekday}_${template.sport}`,
      weekday: template.weekday,
      date: toDateString(addDays(weekStart, weekdayOffset(template.weekday))),
      sport: template.sport,
      title: template.title,
      durationMin,
      intensity: template.intensity,
      focus: template.focus,
    };
    if (template.sport === 'brick') {
      session.adaptiveNote = 'Shorten the off-bike run if RPE climbs above 7.';
    }
    return session;
  });
}

function templatesFor(
  distance: RaceDistance,
  quality: Intensity,
  weeksOut: number | null,
): SessionTemplate[] {
  const taper = weeksOut != null && weeksOut <= 2;
  const longBikeTitle = distance === 'Ironman' || distance === '70.3' ? 'Endurance ride' : 'Steady ride';
  const longRunTitle = distance === 'Ironman' ? 'Long aerobic run' : 'Long run';
  const brickTitle = taper ? 'Short race-pace brick' : 'Bike-run brick';

  return [
    {
      weekday: 'monday',
      sport: 'swim',
      title: 'Technique + easy aerobic',
      intensity: 'z2',
      focus: 'Drills then continuous aerobic swimming. Easy effort.',
      bucket: 'swim',
      share: 0.55,
    },
    {
      weekday: 'tuesday',
      sport: 'bike',
      title: taper ? 'Openers' : 'Quality bike',
      intensity: taper ? 'z2' : quality,
      focus: taper
        ? 'Short race-pace efforts, mostly easy.'
        : 'One quality set; keep the rest of the week aerobic.',
      bucket: 'bike',
      share: 0.28,
    },
    {
      weekday: 'wednesday',
      sport: 'run',
      title: 'Easy aerobic',
      intensity: 'easy',
      focus: 'Conversational pace. Strides optional if legs feel springy.',
      bucket: 'run',
      share: 0.28,
    },
    {
      weekday: 'thursday',
      sport: 'swim',
      title: taper ? 'Easy swim' : 'Threshold 100s',
      intensity: taper ? 'z2' : 'z3',
      focus: taper ? 'Smooth continuous swim.' : 'Short threshold repeats with full recoveries.',
      bucket: 'swim',
      share: 0.45,
    },
    {
      weekday: 'friday',
      sport: 'bike',
      title: longBikeTitle,
      intensity: 'z2',
      focus: 'Steady cadence, practice bottles and fueling.',
      bucket: 'bike',
      share: 0.32,
    },
    {
      weekday: 'saturday',
      sport: 'brick',
      title: brickTitle,
      intensity: taper ? 'mod' : 'mod',
      focus:
        distance === 'Sprint'
          ? 'Shorter ride + 10–15 min off-bike run.'
          : 'Mostly bike, then a short off-bike run to practice the transition.',
      bucket: 'bike',
      share: 0.4,
      brickRunShare: 0.22,
    },
    {
      weekday: 'sunday',
      sport: 'run',
      title: longRunTitle,
      intensity: 'z2',
      focus: 'Even effort. Walk breaks are fine in the last 15 minutes.',
      bucket: 'run',
      share: 0.5,
    },
  ];
}

function qualityIntensity(experience: ExperienceLevel | undefined): Intensity {
  if (experience === 'beginner') return 'z3';
  if (experience === 'advanced') return 'z4';
  return 'z3';
}

function durationCaps(distance: RaceDistance): Record<Sport, number> {
  switch (distance) {
    case 'Sprint':
      return { swim: 60, bike: 90, run: 60, brick: 100, other: 60 };
    case 'Olympic':
      return { swim: 75, bike: 150, run: 80, brick: 150, other: 75 };
    case '70.3':
      return { swim: 75, bike: 210, run: 110, brick: 200, other: 90 };
    case 'Ironman':
      return { swim: 90, bike: 300, run: 150, brick: 240, other: 90 };
  }
}

function snap(minutes: number): number {
  return Math.max(20, Math.round(minutes / 5) * 5);
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

function demoSession(
  weekStart: Date,
  weekday: Weekday,
  sport: PlannedSession['sport'],
  title: string,
  durationMin: number,
  intensity: PlannedSession['intensity'],
  focus: string,
  adaptiveNote?: string,
): PlannedSession {
  const session: PlannedSession = {
    id: `plan_${weekday}_${sport}`,
    weekday,
    date: toDateString(addDays(weekStart, weekdayOffset(weekday))),
    sport,
    title,
    durationMin,
    intensity,
    focus,
  };
  if (adaptiveNote !== undefined) {
    session.adaptiveNote = adaptiveNote;
  }
  return session;
}
