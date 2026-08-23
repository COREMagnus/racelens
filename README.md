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
- An OpenAI API key for session analyze and coach (local only; never commit it)

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
| `OPENAI_API_KEY` | `apps/api` | Required for `POST /sessions/analyze` and `POST /coach/chat`. Missing key → **503** (no silent mock). |
| `OPENAI_TEXT_MODEL` | `apps/api` | Text + coach model. Default **`gpt-4.1-mini`**. |
| `OPENAI_VISION_MODEL` | `apps/api` | Photo / watch-screen model. Default **`gpt-4o-mini`**. |
| `OPENAI_TRANSCRIBE_MODEL` | `apps/api` | Voice audio model. Default **`whisper-1`**. |
| `EXPO_PUBLIC_API_URL` | `apps/mobile` | Base URL for the API. Defaults to `http://localhost:3001`. |

On a physical device, set `EXPO_PUBLIC_API_URL` to your machine's LAN address (Android emulator: `http://10.0.2.2:3001`).

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

## Run the API

```bash
npm run dev:api
```

- `GET /health` — liveness; `ai` is `openai` or `unconfigured`
- `POST /sessions/analyze` — `{ type: "photo" \| "voice" \| "text", payload: string }` → `Session`
- `POST /coach/chat` — `{ messages, athlete, recentSessions?, weekPlan? }` → `{ reply }`
- `GET /plan/week` — sample adaptive week (not an LLM call)

Analyze payloads (string, same shape the mobile Log tab sends):

| `type` | `payload` | What happens |
| --- | --- | --- |
| `text` | Natural-language workout description | Structured into a `Session` |
| `photo` | Image data URI, `https` URL, or raw base64 | Vision model reads watch / whiteboard / card. A local `photo:<uri> — description` fallback is treated as text. |
| `voice` | Transcript text **or** audio data URI / audio URL | Transcript → same as text. Audio → Whisper, then structure. |

Coach uses the athlete profile (race distance, goal date, readiness), plus recent sessions and the week plan when the client sends them. If `weekPlan` is omitted, the API attaches the sample week so replies stay grounded.

Unusable model JSON returns **422** with a reason. Bad request bodies return **400**. OpenAI outages return **502**.

Typecheck:

```bash
npx tsc --noEmit -p apps/api
# or
npm run typecheck:api
```

API unit tests mock the OpenAI client (no live calls):

```bash
npm test
```

## Run the mobile app

With the API running **and** `OPENAI_API_KEY` set:

```bash
npm run dev:mobile
```

Then press `i` (iOS), `a` (Android), or `w` (web). Tabs:

| Tab | What you get |
| --- | --- |
| Home | Today's planned sessions + readiness stub |
| Log | Photo / Voice / Text capture → structured session preview → confirm |
| Plan | Placeholder adaptive week |
| Coach | Chat UI against `POST /coach/chat` |
| Profile | Name, race goal date, distance (Sprint / Olympic / 70.3 / Ironman) |

Photo uses `expo-image-picker` + `expo-camera` and sends a data URI when the picker provides base64. Voice uses `expo-audio` (SDK 57 successor to `expo-av`); the API transcribes audio data URIs and otherwise treats the payload as a transcript.

## Shared types

`packages/shared` exports `Session`, `WeekPlan`, `CoachMessage`, `AthleteProfile`, and the analyze / chat request shapes. Intensity is `z1`–`z5` or `easy` / `mod` / `hard`. Sport is `swim` | `bike` | `run` | `brick` | `other`.

## Scripts

| Command | Description |
| --- | --- |
| `npm install` | Install all workspaces |
| `npm run dev:api` | API with reload |
| `npm run dev:mobile` | Expo dev server |
| `npm run typecheck` | `tsc --noEmit` across shared, api, and mobile |
| `npm test` | API unit tests (mocked OpenAI; no network) |
| `npm run export:web` | Noninteractive Expo web export (`apps/mobile`) |
