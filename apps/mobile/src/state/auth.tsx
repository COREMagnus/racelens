import type { AthleteSnapshot, AuthSessionResponse, AuthUserPublic } from '@racelens/shared';
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

import { getMe, isUnauthorized, loginAccount, logoutAccount, registerAccount, setAuthToken } from '../lib/api';
import { AUTH_STORAGE_KEY, PLAN_STORAGE_KEY, SESSIONS_STORAGE_KEY, STORAGE_KEY } from './storage-key';

interface StoredAuth {
  token: string;
  user: AuthUserPublic;
}

interface AuthContextValue {
  loaded: boolean;
  token: string | null;
  user: AuthUserPublic | null;
  snapshot: AthleteSnapshot | null;
  register: (email: string, password: string) => Promise<AuthSessionResponse>;
  signIn: (email: string, password: string) => Promise<AuthSessionResponse>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserPublic | null>(null);
  const [snapshot, setSnapshot] = useState<AthleteSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (cancelled) return;
        const stored = parseStoredAuth(raw);
        if (!stored) {
          setAuthToken(null);
          setLoaded(true);
          return;
        }
        setAuthToken(stored.token);
        try {
          const me = await getMe();
          if (cancelled) return;
          setToken(stored.token);
          setUser(me.user);
          setSnapshot(me);
        } catch (error) {
          if (cancelled) return;
          if (isUnauthorized(error)) {
            setAuthToken(null);
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          } else {
            setToken(stored.token);
            setUser(stored.user);
          }
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSession = useCallback(async (session: AuthSessionResponse) => {
    setAuthToken(session.token);
    setToken(session.token);
    setUser(session.user);
    setSnapshot({
      user: session.user,
      profile: session.profile,
      sessions: session.sessions,
      plan: session.plan,
    });
    const stored: StoredAuth = { token: session.token, user: session.user };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
  }, []);

  const register = useCallback(
    async (email: string, password: string) => {
      const session = await registerAccount(email, password);
      await persistSession(session);
      return session;
    },
    [persistSession],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await loginAccount(email, password);
      await persistSession(session);
      return session;
    },
    [persistSession],
  );

  const signOut = useCallback(async () => {
    try {
      await logoutAccount();
    } catch {
      // Local sign-out still clears the device.
    }
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setSnapshot(null);
    await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, STORAGE_KEY, SESSIONS_STORAGE_KEY, PLAN_STORAGE_KEY]);
  }, []);

  const value = useMemo(
    () => ({
      loaded,
      token,
      user,
      snapshot,
      register,
      signIn,
      signOut,
    }),
    [loaded, token, user, snapshot, register, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

export function parseStoredAuth(raw: string | null): StoredAuth | null {
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as Record<string, unknown>;
    if (typeof record.token !== 'string' || record.token.length === 0) return null;
    const user = record.user as Record<string, unknown> | undefined;
    if (!user || typeof user.id !== 'string' || typeof user.email !== 'string') return null;
    return { token: record.token, user: { id: user.id, email: user.email } };
  } catch {
    return null;
  }
}
