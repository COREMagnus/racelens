import type {
  AthleteContext,
  AthleteProfile,
  CoachChatRequest,
  CoachMessage,
  Session,
  WeekPlan,
} from '@racelens/shared';
import {
  isRaceDistance,
  isStarterWeekPlan,
  weeklyVolumeHours,
} from '@racelens/shared';

/**
 * Build /coach/chat body from real athlete data only.
 * Demo sample weeks and fabricated readiness are never attached.
 */
export function buildCoachChatRequest(
  messages: CoachMessage[],
  profile: AthleteProfile,
  extras: { weekPlan?: WeekPlan; recentSessions?: Session[] } = {},
): CoachChatRequest {
  const request: CoachChatRequest = {
    messages,
    athlete: toAthleteContext(profile),
  };
  if (extras.weekPlan && isStarterWeekPlan(extras.weekPlan)) {
    request.weekPlan = extras.weekPlan;
  }
  if (extras.recentSessions && extras.recentSessions.length > 0) {
    request.recentSessions = extras.recentSessions;
  }
  return request;
}

export function toAthleteContext(profile: AthleteProfile): AthleteContext {
  const name = profile.name.trim();
  const athlete: AthleteContext = {
    name: name || 'athlete',
  };
  if (isRaceDistance(profile.raceDistance)) {
    athlete.raceDistance = profile.raceDistance;
    const date = profile.raceGoalDate.trim();
    if (date) athlete.raceGoalDate = date;
  }
  const hours = weeklyVolumeHours(profile.weeklyVolume);
  if (hours != null) athlete.weeklyVolumeHours = hours;
  if (profile.experienceLevel) athlete.experienceLevel = profile.experienceLevel;
  const constraints = profile.constraints.trim();
  if (constraints) athlete.constraints = constraints;
  return athlete;
}
