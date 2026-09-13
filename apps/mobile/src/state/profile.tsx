import type { AthleteProfile } from '@racelens/shared';
import {
  emptyAthleteProfile,
  hasRequiredOnboardingFields,
  parseStoredAthleteProfile,
} from '@racelens/shared';
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

import { STORAGE_KEY } from './storage-key';

interface ProfileContextValue {
  profile: AthleteProfile;
  loaded: boolean;
  hasCompletedOnboarding: boolean;
  saveProfile: (next: AthleteProfile) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AthleteProfile>(emptyAthleteProfile);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      if (raw) {
        try {
          setProfile(parseStoredAthleteProfile(JSON.parse(raw) as unknown));
        } catch {
          setProfile(emptyAthleteProfile());
        }
      } else {
        setProfile(emptyAthleteProfile());
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = useCallback(async (next: AthleteProfile) => {
    setProfile(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const value = useMemo(
    () => ({
      profile,
      loaded,
      hasCompletedOnboarding: hasRequiredOnboardingFields(profile),
      saveProfile,
    }),
    [profile, loaded, saveProfile],
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
