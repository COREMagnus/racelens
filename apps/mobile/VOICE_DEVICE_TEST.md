# Manual voice capture checklist (iOS / Android)

Status: **not run in this environment** (no physical devices or simulators attached). Run before a production-facing mobile release.

Prerequisites: API running locally with `OPENAI_API_KEY`, `EXPO_PUBLIC_API_URL` pointed at that API, Expo Go or a dev build.

## iOS

1. Grant microphone permission when prompted.
2. Record a 10–20 second clip describing a real workout (`easy 40 minute run`).
3. Confirm the request payload is a `data:audio/...;base64,` string (Charles / Flipper / API logs) — never a raw `file://` URI treated as transcript text.
4. Confirm analyze returns a structured session draft.
5. Record past 3 minutes and confirm a clear in-app error (no upload).
6. Deny microphone permission and confirm a permission error, not a fake session.

## Android

1. Repeat steps 1–6 on a physical Android device or emulator.
2. Confirm `content://` recordings are read through Expo FileSystem and become a data URI.

## Web (optional)

1. Record in Expo web.
2. Confirm a `blob:` recording is converted to a data URI.
3. Confirm a `file://` path is rejected with a clear error.

## Do not

- Submit remote `https://` audio URLs.
- Paste secrets into the Log text field or commit recordings.
