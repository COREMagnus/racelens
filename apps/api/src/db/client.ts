import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { isTest } from '../lib/env';

export type AppDatabase = DatabaseSync;

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS athlete_profiles (
  user_id TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS logged_sessions (
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  session_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, session_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS week_plans (
  user_id TEXT PRIMARY KEY,
  plan_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_logged_sessions_user ON logged_sessions(user_id, started_at);
`;

export function resolveDatabasePath(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.DATABASE_PATH?.trim();
  if (explicit) return explicit;
  if (isTest(env)) return ':memory:';
  return resolve(process.cwd(), 'data', 'triadapt.sqlite');
}

export function openDatabase(env: NodeJS.ProcessEnv = process.env): AppDatabase {
  const path = resolveDatabasePath(env);
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}
