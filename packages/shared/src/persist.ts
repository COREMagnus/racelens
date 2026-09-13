import { isDemoWeekPlan } from './plan';
import type { PlannedSession, WeekPlan, WeekPlanKind, Weekday } from './plan';
import { WEEKDAYS } from './plan';
import {
  INTENSITY_FEELS,
  INTENSITY_ZONES,
  SPORTS,
  type CaptureSource,
  type Intensity,
  type Session,
  type Sport,
} from './session';

const CAPTURE_SOURCES: readonly CaptureSource[] = ['photo', 'voice', 'text', 'manual'];
const INTENSITIES: readonly Intensity[] = [...INTENSITY_ZONES, ...INTENSITY_FEELS];
const PLAN_KINDS: readonly WeekPlanKind[] = ['demo', 'starter'];

export function parseStoredSession(raw: unknown): Session | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) return null;
  if (!isSport(record.sport)) return null;
  if (typeof record.startedAt !== 'string' || record.startedAt.length === 0) return null;
  if (!isFiniteNumber(record.durationMin)) return null;
  if (!isIntensity(record.intensity)) return null;
  if (!isFiniteNumber(record.load)) return null;
  if (!isFiniteNumber(record.rpe)) return null;
  if (typeof record.notes !== 'string') return null;
  if (!isCaptureSource(record.source)) return null;
  return {
    id: record.id,
    sport: record.sport,
    startedAt: record.startedAt,
    durationMin: record.durationMin,
    intensity: record.intensity,
    load: record.load,
    rpe: record.rpe,
    notes: record.notes,
    source: record.source,
  };
}

export function parseStoredSessions(raw: unknown): Session[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseStoredSession).filter((session): session is Session => session != null);
}

/**
 * Read a persisted week plan. Demo weeks are rejected so they never become
 * stored athlete state or Coach grounding.
 */
export function parseStoredWeekPlan(raw: unknown): WeekPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.weekStart !== 'string' || record.weekStart.length === 0) return null;
  if (typeof record.theme !== 'string' || record.theme.length === 0) return null;
  if (typeof record.readinessNote !== 'string') return null;
  if (!Array.isArray(record.sessions)) return null;

  const sessions: PlannedSession[] = [];
  for (const item of record.sessions) {
    const session = parsePlannedSession(item);
    if (!session) return null;
    sessions.push(session);
  }

  const plan: WeekPlan = {
    weekStart: record.weekStart,
    theme: record.theme,
    readinessNote: record.readinessNote,
    sessions,
  };
  if (typeof record.readinessScore === 'number' && Number.isFinite(record.readinessScore)) {
    plan.readinessScore = record.readinessScore;
  }
  if (isPlanKind(record.kind)) {
    plan.kind = record.kind;
  }
  if (isDemoWeekPlan(plan)) {
    return null;
  }
  return plan;
}

function parsePlannedSession(raw: unknown): PlannedSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) return null;
  if (!isWeekday(record.weekday)) return null;
  if (typeof record.date !== 'string' || record.date.length === 0) return null;
  if (!isSport(record.sport)) return null;
  if (typeof record.title !== 'string' || record.title.length === 0) return null;
  if (!isFiniteNumber(record.durationMin)) return null;
  if (!isIntensity(record.intensity)) return null;
  if (typeof record.focus !== 'string') return null;
  const session: PlannedSession = {
    id: record.id,
    weekday: record.weekday,
    date: record.date,
    sport: record.sport,
    title: record.title,
    durationMin: record.durationMin,
    intensity: record.intensity,
    focus: record.focus,
  };
  if (typeof record.adaptiveNote === 'string') {
    session.adaptiveNote = record.adaptiveNote;
  }
  return session;
}

function isSport(value: unknown): value is Sport {
  return typeof value === 'string' && (SPORTS as readonly string[]).includes(value);
}

function isIntensity(value: unknown): value is Intensity {
  return typeof value === 'string' && (INTENSITIES as readonly string[]).includes(value);
}

function isCaptureSource(value: unknown): value is CaptureSource {
  return typeof value === 'string' && (CAPTURE_SOURCES as readonly string[]).includes(value);
}

function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'string' && (WEEKDAYS as readonly string[]).includes(value);
}

function isPlanKind(value: unknown): value is WeekPlanKind {
  return typeof value === 'string' && (PLAN_KINDS as readonly string[]).includes(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
