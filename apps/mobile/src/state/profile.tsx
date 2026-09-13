import type { AthleteProfile, Session, WeekPlan } from '@racelens/shared';
import {
  emptyAthleteProfile,
  generateStarterWeek,
  hasRequiredOnboardingFields,
  parseStoredAthleteProfile,
  parseStoredSessions,
  parseStoredWeekPlan,
} from '@racelens/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { postLoggedSession, putAthleteProfile } from '../lib/api';
import { useAuth } from './auth';
import { PLAN_STORAGE_KEY, SESSIONS_STORAGE_KEY, STORAGE_KEY } from './storage-key';

interface ProfileContextValue {
  profile: AthleteProfile;
  sessions: Session[];
  weekPlan: WeekPlan | null;
  loaded: boolean;
  hasCompletedOnboarding: boolean;
  saveProfile: (next: AthleteProfile) => Promise<void>;
  confirmSession: (session: Session) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { loaded: authLoaded, token, snapshot } = useAuth();
  const [profile, setProfile] = useState<AthleteProfile>(emptyAthleteProfile);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [loaded, setLoaded] = useState(false);
  const hydratedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoaded) return;
    let cancelled = false;

    void (async () => {
      if (token && snapshot && hydratedToken.current === token) {
        if (!cancelled) setLoaded(true);
        return;
      }

      if (snapshot) {
        hydratedToken.current = token;
        const nextProfile = snapshot.profile ?? emptyAthleteProfile();
        if (cancelled) return;
        setProfile(nextProfile);
        setSessions(snapshot.sessions);
        setWeekPlan(snapshot.plan);
        await persistLocal(nextProfile, snapshot.sessions, snapshot.plan);
        if (!cancelled) setLoaded(true);
        return;
      }

      if (!token) {
        hydratedToken.current = null;
        if (cancelled) return;
        setProfile(emptyAthleteProfile());
        setSessions([]);
        setWeekPlan(null);
        setLoaded(true);
        return;
      }

      const [rawProfile, rawSessions, rawPlan] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(SESSIONS_STORAGE_KEY),
        AsyncStorage.getItem(PLAN_STORAGE_KEY),
      ]);
      if (cancelled) return;
      setProfile(rawProfile ? parseStoredAthleteProfile(safeJson(rawProfile)) : emptyAthleteProfile());
      setSessions(rawSessions ? parseStoredSessions(safeJson(rawSessions)) : []);
      setWeekPlan(rawPlan ? parseStoredWeekPlan(safeJson(rawPlan)) : null);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, snapshot, token]);

  const saveProfile = useCallback(
    async (next: AthleteProfile) => {
      const starter = generateStarterWeek(next);
      setProfile(next);
      setWeekPlan(starter);
      await persistLocal(next, sessions, starter);
      if (token) {
        const saved = await putAthleteProfile(next);
        setProfile(saved.profile);
        setWeekPlan(saved.plan);
        await persistLocal(saved.profile, sessions, saved.plan);
      }
    },
    [sessions, token],
  );

  const confirmSession = useCallback(
    async (session: Session) => {
      const nextSessions = [session, ...sessions.filter((item) => item.id !== session.id)];
      setSessions(nextSessions);
      await persistLocal(profile, nextSessions, weekPlan);
      if (token) {
        await postLoggedSession(session);
      }
    },
    [profile, sessions, token, weekPlan],
  );

  const value = useMemo(
    () => ({
      profile,
      sessions,
      weekPlan,
      loaded,
      hasCompletedOnboarding: hasRequiredOnboardingFields(profile),
      saveProfile,
      confirmSession,
    }),
    [profile, sessions, weekPlan, loaded, saveProfile, confirmSession],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used inside ProfileProvider');
  }
  return ctx;
}

async function persistLocal(
  profile: AthleteProfile,
  sessions: Session[],
  plan: WeekPlan | null,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  if (plan) {
    await AsyncStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
  } else {
    await AsyncStorage.removeItem(PLAN_STORAGE_KEY);
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
