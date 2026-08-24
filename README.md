# RaceLens

RaceLens is a PlateLens-style mobile app for triathlon coaching. Athletes capture training from a watch photo, whiteboard, voice note, or text. OpenAI turns that capture into a structured session (sport, duration, intensity, load, RPE). An adaptive weekly plan and an in-app coach sit on top.

v1 is **athlete self-coach only** — there is no coach dashboard yet.

## Monorepo

```
apps/mobile     Expo (React Native) + TypeScript, Expo Router tabs
apps/api        Express + TypeScript API (OpenAI analyze + coach)
packages/shared Session, plan, coach, and athlete types
```

Workspaces use **npm**.

## Prerequisites

- Node.js 20.19+ (Expo SDK 57 targets modern Node; 22.13+ is preferred)
- npm 10+
- Expo Go or a simulator/emulator for the mobile app
- An OpenAI API key for **local** session analyze and coach (never commit it; never put it in `EXPO_PUBLIC_*`)

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
| `OPENAI_API_KEY` | `apps/api` only | Required for local `POST /sessions/analyze` and `POST /coach/chat`. Missing key → **503**. Never expose to the mobile app. |
| `OPENAI_TEXT_MODEL` | `apps/api` | Text + coach model. Default **`gpt-4.1-mini`**. |
| `OPENAI_VISION_MODEL` | `apps/api` | Photo / watch-screen model. Default **`gpt-4o-mini`**. |
| `OPENAI_TRANSCRIBE_MODEL` | `apps/api` | Voice audio model. Default **`whisper-1`**. |
| `NODE_ENV` | `apps/api` | When `production`, analyze + coach return **503** until real user-auth middleware exists. Local dev stays enabled. |
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

## Run the API

```bash
npm run dev:api
```

- `GET /health` — liveness; `ai` is `openai`, `unconfigured`, or `disabled-production`
- `POST /sessions/analyze` — `{ type: "photo" \| "voice" \| "text", payload: string }` → `Session` (local/dev only)
- `POST /coach/chat` — `{ messages, athlete, recentSessions?, weekPlan? }` → `{ reply }` (local/dev only)
- `GET /plan/week` — **sample demo week**. Labeled as demo. Never used to ground Coach.

Analyze payloads (string, same shape the mobile Log tab sends):

| `type` | `payload` | What happens |
| --- | --- | --- |
| `text` | Natural-language workout description | Structured into a `Session` |
| `photo` | Image data URI, `https` URL, or raw base64 | Vision model reads watch / whiteboard / card. A local `photo:<uri> — description` fallback is treated as text. |
| `voice` | Transcript text **or** audio data URI | Transcript → same as text. Audio data URI → Whisper, then structure. **Remote audio URLs are rejected (400).** |

Coach uses only athlete fields, recent sessions, and week plan that the client actually sent. Missing readiness / sessions / plan are treated as unknown — the sample week is never substituted.

Unusable model JSON returns **422**. Bad request bodies return **400**. OpenAI outages return **502**. Production without auth middleware returns **503**.

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

Then press `i` (iOS), `a` (Android), or `w` (web). Tabs:

| Tab | What you get |
| --- | --- |
| Home | Today's planned sessions + **demo** readiness (not sent to Coach) |
| Log | Photo / Voice / Text capture → structured session preview → confirm |
| Plan | Sample demo week (not used by Coach) |
| Coach | Chat UI against `POST /coach/chat` (profile only; no fabricated readiness) |
| Profile | Name, race goal date, distance (Sprint / Olympic / 70.3 / Ironman) |

Photo uses `expo-image-picker` + `expo-camera` and sends a data URI when the picker provides base64. Voice uses `expo-audio` plus **Expo FileSystem** to read the recording into a data URI (no `fetch(file://...)`). See `apps/mobile/VOICE_DEVICE_TEST.md` for the iOS/Android checklist.

## Shared types

`packages/shared` exports `Session`, `WeekPlan`, `CoachMessage`, `AthleteProfile`, and the analyze / chat request shapes. Intensity is `z1`–`z5` or `easy` / `mod` / `hard`. Sport is `swim` | `bike` | `run` | `brick` | `other`.

## Scripts

| Command | Description |
| --- | --- |
| `npm install` | Install all workspaces |
| `npm run dev:api` | API with reload |
| `npm run dev:mobile` | Expo dev server |
| `npm run typecheck` | `tsc --noEmit` across shared, api, and mobile |
| `npm test` | API + mobile unit/integration tests (mocked OpenAI; coverage on API) |
| `npm run export:web` | Noninteractive Expo web export (`apps/mobile`) |
