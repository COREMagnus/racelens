import type { AthleteProfile, AthleteSnapshot, AuthUserPublic, Session, WeekPlan } from '@racelens/shared';
import { parseStoredAthleteProfile, parseStoredSession, parseStoredWeekPlan } from '@racelens/shared';

import { createId } from '../lib/id';
import type { AppDatabase } from './client';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

interface AuthSessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  email: string;
}

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthContext {
  sessionId: string;
  user: AuthUserPublic;
}

export function createUser(db: AppDatabase, email: string, passwordHash: string): AuthUserPublic {
  const id = createId('usr');
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
  ).run(id, email, passwordHash, createdAt);
  return { id, email };
}

export function findUserByEmail(db: AppDatabase, email: string): StoredUser | null {
  const row = db.prepare('SELECT id, email, password_hash, created_at FROM users WHERE email = ?').get(email) as
    | UserRow
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

export function createAuthSession(
  db: AppDatabase,
  userId: string,
  tokenHash: string,
  expiresAt: string,
): string {
  const id = createId('sess');
  db.prepare(
    'INSERT INTO auth_sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, userId, tokenHash, new Date().toISOString(), expiresAt);
  return id;
}

export function findAuthByTokenHash(db: AppDatabase, tokenHash: string, now = new Date()): AuthContext | null {
  const row = db
    .prepare(
      `SELECT s.id, s.user_id, s.token_hash, s.created_at, s.expires_at, u.email
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(tokenHash) as AuthSessionRow | undefined;
  if (!row) return null;
  if (Date.parse(row.expires_at) <= now.getTime()) {
    db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(row.id);
    return null;
  }
  return {
    sessionId: row.id,
    user: { id: row.user_id, email: row.email },
  };
}

export function deleteAuthSession(db: AppDatabase, sessionId: string): void {
  db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(sessionId);
}

export function getProfile(db: AppDatabase, userId: string): AthleteProfile | null {
  const row = db.prepare('SELECT profile_json FROM athlete_profiles WHERE user_id = ?').get(userId) as
    | { profile_json: string }
    | undefined;
  if (!row) return null;
  try {
    return parseStoredAthleteProfile(JSON.parse(row.profile_json) as unknown);
  } catch {
    return null;
  }
}

export function putProfile(db: AppDatabase, userId: string, profile: AthleteProfile): AthleteProfile {
  const normalized = parseStoredAthleteProfile(profile);
  db.prepare(
    `INSERT INTO athlete_profiles (user_id, profile_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at`,
  ).run(userId, JSON.stringify(normalized), new Date().toISOString());
  return normalized;
}

export function listSessions(db: AppDatabase, userId: string): Session[] {
  const rows = db
    .prepare(
      'SELECT session_json FROM logged_sessions WHERE user_id = ? ORDER BY started_at DESC, created_at DESC',
    )
    .all(userId) as { session_json: string }[];
  const sessions: Session[] = [];
  for (const row of rows) {
    try {
      const parsed = parseStoredSession(JSON.parse(row.session_json) as unknown);
      if (parsed) sessions.push(parsed);
    } catch {
      // skip corrupt rows
    }
  }
  return sessions;
}

export function upsertSession(db: AppDatabase, userId: string, session: Session): Session {
  db.prepare(
    `INSERT INTO logged_sessions (user_id, session_id, session_json, started_at, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, session_id) DO UPDATE SET
       session_json = excluded.session_json,
       started_at = excluded.started_at`,
  ).run(userId, session.id, JSON.stringify(session), session.startedAt, new Date().toISOString());
  return session;
}

export function getPlan(db: AppDatabase, userId: string): WeekPlan | null {
  const row = db.prepare('SELECT plan_json FROM week_plans WHERE user_id = ?').get(userId) as
    | { plan_json: string }
    | undefined;
  if (!row) return null;
  try {
    return parseStoredWeekPlan(JSON.parse(row.plan_json) as unknown);
  } catch {
    return null;
  }
}

export function putPlan(db: AppDatabase, userId: string, plan: WeekPlan | null): WeekPlan | null {
  if (plan == null) {
    db.prepare('DELETE FROM week_plans WHERE user_id = ?').run(userId);
    return null;
  }
  db.prepare(
    `INSERT INTO week_plans (user_id, plan_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET plan_json = excluded.plan_json, updated_at = excluded.updated_at`,
  ).run(userId, JSON.stringify(plan), new Date().toISOString());
  return plan;
}

export function getSnapshot(db: AppDatabase, user: AuthUserPublic): AthleteSnapshot {
  return {
    user,
    profile: getProfile(db, user.id),
    sessions: listSessions(db, user.id),
    plan: getPlan(db, user.id),
  };
}
