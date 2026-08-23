import type { AthleteProfile, RaceDistance } from '@racelens/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'racelens.athlete.v1';

const DEFAULT_PROFILE: AthleteProfile = {
  name: 'Alex',
  raceGoalDate: nextSeasonGoalDate(),
  raceDistance: '70.3',
};

interface ProfileContextValue {
  profile: AthleteProfile;
  loaded: boolean;
  updateProfile: (patch: Partial<AthleteProfile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AthleteProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<AthleteProfile>;
          setProfile({
            name: parsed.name ?? DEFAULT_PROFILE.name,
            raceGoalDate: parsed.raceGoalDate ?? DEFAULT_PROFILE.raceGoalDate,
            raceDistance: isRaceDistance(parsed.raceDistance)
              ? parsed.raceDistance
              : DEFAULT_PROFILE.raceDistance,
          });
        } catch {
          setProfile(DEFAULT_PROFILE);
        }
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateProfile = useCallback(async (patch: Partial<AthleteProfile>) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [profile]);

  const value = useMemo(
    () => ({ profile, loaded, updateProfile }),
    [profile, loaded, updateProfile],
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

function isRaceDistance(value: unknown): value is RaceDistance {
  return value === 'Sprint' || value === 'Olympic' || value === '70.3' || value === 'Ironman';
}

function nextSeasonGoalDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 5);
  return date.toISOString().slice(0, 10);
}
