# TriAdapt

**Your adaptive AI triathlon coach.**

TriAdapt turns workout data into structured sessions and personalized coaching that adapts to the athlete’s training, readiness, goals, and schedule. Athletes capture training from a watch photo, whiteboard, voice note, or text. OpenAI turns that capture into a structured session (sport, duration, intensity, load, RPE). An adaptive weekly plan and an in-app coach sit on top.

v1 is **athlete self-coach only** — there is no coach dashboard yet. First launch collects a real athlete profile and race goal so Home, Plan, and Coach stop using unlabeled demo data.

## Monorepo

```
apps/mobile     Expo (React Native) + TypeScript, Expo Router tabs
apps/api        Express + TypeScript API (auth, SQLite persistence, OpenAI analyze + coach)
packages/shared Session, plan, coach, athlete, and auth types
```

Workspaces use **npm**.

## Prerequisites

- Node.js **22.13+** for the API (built-in `node:sqlite`). Mobile/Expo still targets 20.19+; 22.13+ is preferred for the whole repo.
- npm 10+
- Expo Go or a simulator/emulator for the mobile app
- An OpenAI API key for session analyze and coach (never commit it; never put it in `EXPO_PUBLIC_*`)
- **No cloud vendor account** is required. Auth is email/password; data lives in a local SQLite file.

## Install

```bash
npm install
```

## Environment

Copy the API example env (no secrets belong in git):

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Where | Purpose |
| --- | --- | --- |
| `PORT` | `apps/api` | API port. Defaults to `3001`. |
| `OPENAI_API_KEY` | `apps/api` only | Required for `POST /sessions/analyze` and `POST /coach/chat`. Missing key → **503**. Never expose to the mobile app. |
| `OPENAI_TEXT_MODEL` | `apps/api` | Text + coach model. Default **`gpt-4.1-mini`**. |
| `OPENAI_VISION_MODEL` | `apps/api` | Photo / watch-screen model. Default **`gpt-4o-mini`**. |
| `OPENAI_TRANSCRIBE_MODEL` | `apps/api` | Voice audio model. Default **`whisper-1`**. |
| `NODE_ENV` | `apps/api` | When `production`, analyze + coach require a valid Bearer session (**401** without one). Local/dev still allows those routes without a session. |
| `DATABASE_PATH` | `apps/api` | SQLite file. Default `./data/triadapt.sqlite` (created on first run). Tests use `:memory:` unless overridden. |
| `AUTH_SESSION_DAYS` | `apps/api` | Bearer session lifetime. Default `30`. Only a SHA-256 hash of the token is stored. |
| `AUTH_SCRYPT_N` | `apps/api` | scrypt cost (power of 2). Default `16384` locally; tests use `4`. |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `apps/api` | Per-IP window for `/auth/register` and `/auth/login`. Default `60000`. |
| `AUTH_RATE_LIMIT_MAX` | `apps/api` | Max auth requests per window. Default `20`. `0` disables (tests). |
| `CORS_ORIGINS` | `apps/api` | Comma-separated browser origins. No `Origin` header (native) is allowed. Production rejects unlisted browser origins. |
| `AI_RATE_LIMIT_WINDOW_MS` | `apps/api` | Per-IP window for AI routes. Default `60000`. |
| `AI_RATE_LIMIT_MAX` | `apps/api` | Max AI requests per window. Default `30`. `0` disables (tests). |
| `AI_JSON_BODY_LIMIT` | `apps/api` | Express JSON body limit. Default `8mb`. |
| `AI_MAX_PAYLOAD_CHARS` | `apps/api` | Max **encoded** analyze payload (data URIs). Default `6000000`. Not the text limit. |
| `AI_MAX_MEDIA_BYTES` | `apps/api` | Max decoded audio/image bytes before OpenAI. Default `4194304`. |
| `AI_MAX_ANALYZE_TEXT_CHARS` | `apps/api` | Max analyze text / transcript / photo hint. Default `20000`. |
| `AI_MAX_COACH_MESSAGES` | `apps/api` | Max coach messages. Default `30`. |
| `AI_MAX_COACH_MESSAGE_CHARS` | `apps/api` | Max characters per coach message. Default `8000`. |
| `AI_MAX_COACH_CONTEXT_CHARS` | `apps/api` | Max total coach textual context. Default `100000`. |
| `AI_MAX_RECENT_SESSIONS` | `apps/api` | Max recent sessions on a coach request. Default `50`. |
| `AI_MAX_WEEK_PLAN_SESSIONS` | `apps/api` | Max planned sessions in a week plan. Default `21`. |
| `AI_MAX_SESSION_NOTES_CHARS` | `apps/api` | Max session notes characters. Default `4000`. |
| `TRUST_PROXY` | `apps/api` | Set `true` only behind a trusted reverse proxy. |
| `EXPO_PUBLIC_API_URL` | `apps/mobile` | Base URL for the API. Defaults to `http://localhost:3001`. |

On a physical device, set `EXPO_PUBLIC_API_URL` to your machine's LAN address (Android emulator: `http://10.0.2.2:3001`).

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

## Auth + database (local)

Email/password accounts and athlete data use **SQLite on the API host**. There is no Auth0/Clerk/Supabase step and no shared secret in the mobile app.

```bash
cp apps/api/.env.example apps/api/.env
npm run dev:api
```

The API creates `apps/api/data/triadapt.sqlite` (or `DATABASE_PATH`) on first request. CI and `npm test` use an in-memory database — no hosted cloud DB.

| Route | Auth | Purpose |
| --- | --- | --- |
| `POST /auth/register` | public | `{ email, password }` → `{ token, user, profile, sessions, plan }` |
| `POST /auth/login` | public | Same shape. Email is normalized to lowercase. |
| `POST /auth/logout` | bearer | Deletes the current session. |
| `GET /me` | bearer | Snapshot used after sign-in / new install. |
| `PUT /me/profile` | bearer | Saves the athlete profile and a generated starter week (never a demo week). |
| `GET/POST /me/sessions` | bearer | Confirmed / logged sessions. |
| `GET/PUT /me/plan` | bearer | Week-plan state. `kind: "demo"` is rejected (**400**). |

Mobile stores the bearer token in AsyncStorage (`racelens.auth.v1`) and sends `Authorization: Bearer <token>`. The raw token is not a shared API key; each login issues a new random value.

## Run the API

```bash
npm run dev:api
```

- `GET /health` — liveness; `ai` is `openai` or `unconfigured`. `aiAccess` is `local` or `authenticated`. Also reports `auth: email-password` and `database: sqlite`.
- `POST /sessions/analyze` — `{ type: "photo" \| "voice" \| "text", payload: string }` → `Session` (local/dev without a session; **production requires a signed-in user**)
- `POST /coach/chat` — `{ messages, athlete, recentSessions?, weekPlan? }` → `{ reply }` (same gating)
- `GET /plan/week` — **sample demo week**. Labeled as demo. Never used to ground Coach. Home/Plan use a persisted starter week after sign-in, or generate one from the saved goal.

Analyze payloads (string, same shape the mobile Log tab sends):

| `type` | `payload` | What happens |
| --- | --- | --- |
| `text` | Natural-language workout description | Structured into a `Session` |
| `photo` | Image data URI, `https` URL, or raw base64 | Vision model reads watch / whiteboard / card. A local `photo:<uri> — description` fallback is treated as text. |
| `voice` | Transcript text **or** audio data URI | Transcript → same as text. Audio data URI → Whisper, then structure. **Remote audio URLs are rejected (400).** |

Coach uses only athlete fields, recent sessions, and week plan that the client actually sent. Missing readiness / sessions / plan / race goal are treated as unknown — the sample week is never substituted. A starter week is sent only when it was generated from the athlete’s saved goal and volume.

Unusable model JSON returns **422**. Bad request bodies return **400**. OpenAI outages return **502**. Production without a valid session returns **401**. Missing `OPENAI_API_KEY` still returns **503**.

Typecheck:

```bash
npx tsc --noEmit -p apps/api
# or
npm run typecheck:api
```

Tests mock the OpenAI client (no live calls) and enforce API coverage:

```bash
npm test
```

Optional local live smoke test (not used in CI):

```bash
npm run smoke:ai -w @racelens/api
```

## Run the mobile app

With the API running **and** `OPENAI_API_KEY` set:

```bash
npm run dev:mobile
```

Then press `i` (iOS), `a` (Android), or `w` (web).

First launch shows **create account / sign in**. After sign-in, **onboarding** is blocking until a display name, race distance (or “not racing yet”), goal date when racing, and typical weekly volume are saved. Those fields, confirmed sessions, and the starter week then live on the server and reload on a new install. Profile can edit the goal later.

| Tab | What you get |
| --- | --- |
| Home | Race goal + weeks out, or **No race goal yet**. Readiness stays **unknown**. Today’s sessions from a labeled starter week, or a labeled demo week. |
| Log | Photo / Voice / Text capture → structured session preview → confirm (synced) |
| Plan | Starter week from goal + volume, or **Demo plan — not based on your goal** |
| Coach | Chat UI against `POST /coach/chat` (real profile / starter week only; no fabricated readiness) |
| Profile | Account email, sign out, name, race distance (incl. not racing), goal date, weekly volume, optional experience and constraints |

Photo uses `expo-image-picker` + `expo-camera` and sends a data URI when the picker provides base64. Voice uses `expo-audio` plus **Expo FileSystem** to read the recording into a data URI (no `fetch(file://...)`). See `apps/mobile/VOICE_DEVICE_TEST.md` for the iOS/Android checklist.

## Product identifiers

User-facing name, Expo display name, slug, and URL scheme are **TriAdapt** / `triadapt`.

These `racelens` technical identifiers are **intentionally retained** (compatibility exceptions). They are not user-facing product names:

| Identifier | Where | Why retained |
| --- | --- | --- |
| GitHub repository `COREMagnus/racelens` | remote origin | Do not rename the remote repository from this PR. |
| npm workspaces `racelens`, `@racelens/api`, `@racelens/mobile`, `@racelens/shared` | `package.json` / imports | Private unpublished workspaces already wired to the GitHub repo name. No published npm packages exist; changing scopes would churn the lockfile without a user-facing benefit while the remote repo stays `racelens`. |
| iOS `bundleIdentifier` / Android `package` `org.racelens.app` | `apps/mobile/app.json` | No App Store Connect or Play Console access from this environment, so store/provisioning use cannot be ruled out. |
| AsyncStorage key `racelens.athlete.v1` | `apps/mobile/src/state/profile.tsx` | Preserves any local athlete profile already saved on a device running an earlier build. Companion keys `racelens.auth.v1`, `racelens.sessions.v1`, and `racelens.plan.v1` are new local caches; the server is the source of truth after sign-in. |

## Shared types

`packages/shared` exports `Session`, `WeekPlan`, `CoachMessage`, `AthleteProfile`, auth snapshot types, and the analyze / chat request shapes. Intensity is `z1`–`z5` or `easy` / `mod` / `hard`. Sport is `swim` | `bike` | `run` | `brick` | `other`.

## Scripts

| Command | Description |
| --- | --- |
| `npm install` | Install all workspaces |
| `npm run dev:api` | API with reload |
| `npm run dev:mobile` | Expo dev server |
| `npm run typecheck` | `tsc --noEmit` across shared, api, and mobile |
| `npm test` | Shared + API + mobile unit/integration tests (mocked OpenAI; coverage on API) |
| `npm run export:web` | Noninteractive Expo web export (`apps/mobile`) |
