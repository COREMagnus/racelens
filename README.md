# RaceLens

RaceLens is a PlateLens-style mobile app for triathlon coaching. Athletes capture training from a watch photo, whiteboard, voice note, or text. A stubbed AI layer turns that capture into a structured session (sport, duration, intensity, load, RPE). An adaptive weekly plan and an in-app coach sit on top.

v1 is **athlete self-coach only** — there is no coach dashboard yet. Model calls are mocked and marked with `TODO(ai)`.

## Monorepo

```
apps/mobile     Expo (React Native) + TypeScript, Expo Router tabs
apps/api        Express + TypeScript stub API
packages/shared Session, plan, coach, and athlete types
```

Workspaces use **npm**.

## Prerequisites

- Node.js 20.19+ (Expo SDK 57 targets modern Node; 22.13+ is preferred)
- npm 10+
- Expo Go or a simulator/emulator for the mobile app

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
| `OPENAI_API_KEY` | `apps/api` | Reserved. Unused until real vision / LLM work lands. |
| `EXPO_PUBLIC_API_URL` | `apps/mobile` | Base URL for the API. Defaults to `http://localhost:3001`. |

On a physical device, set `EXPO_PUBLIC_API_URL` to your machine's LAN address (Android emulator: `http://10.0.2.2:3001`).

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

## Run the API

```bash
npm run dev:api
```

- `GET /health` — liveness
- `POST /sessions/analyze` — `{ type: "photo" \| "voice" \| "text", payload: string }` → `Session`
- `POST /coach/chat` — `{ messages, athlete }` → `{ reply }`
- `GET /plan/week` — sample adaptive week

Typecheck:

```bash
npx tsc --noEmit -p apps/api
# or
npm run typecheck:api
```

## Run the mobile app

With the API running:

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

Photo uses `expo-image-picker` + `expo-camera`. Voice uses `expo-audio` (SDK 57 successor to `expo-av`). Both are wired as capture stubs; the API still receives a string payload.

## Shared types

`packages/shared` exports `Session`, `WeekPlan`, `CoachMessage`, `AthleteProfile`, and the analyze / chat request shapes. Intensity is `z1`–`z5` or `easy` / `mod` / `hard`. Sport is `swim` | `bike` | `run` | `brick`.

## Scripts

| Command | Description |
| --- | --- |
| `npm install` | Install all workspaces |
| `npm run dev:api` | API with reload |
| `npm run dev:mobile` | Expo dev server |
| `npm run typecheck` | `tsc --noEmit` across shared, api, and mobile |
