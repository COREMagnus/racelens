import type { CaptureSource, Session } from '@racelens/shared';
import { ZodError } from 'zod';

import { AiParseError } from './errors';
import { clampInt, estimateLoad } from './load';
import { parseSessionExtraction, type SessionExtraction } from './schema';

export function mapExtractedSession(
  extracted: SessionExtraction,
  source: CaptureSource,
  options: { now?: Date; id: string },
): Session {
  const durationMin = clampInt(extracted.durationMin, 1, 24 * 60);
  const intensity = extracted.intensity;
  const rpe = clampInt(extracted.rpe, 1, 10);
  const load =
    extracted.load == null || extracted.load <= 0
      ? estimateLoad(durationMin, intensity)
      : clampInt(extracted.load, 1, 5000);

  return {
    id: options.id,
    sport: extracted.sport,
    startedAt: parseStartedAt(extracted.startedAt) ?? (options.now ?? new Date()).toISOString(),
    durationMin,
    intensity,
    load,
    rpe,
    notes: extracted.notes.trim() || fallbackNotes(source),
    source,
  };
}

export function sessionFromModelOutput(
  value: unknown,
  source: CaptureSource,
  options: { now?: Date; id: string },
): Session {
  try {
    return mapExtractedSession(parseSessionExtraction(value), source, options);
  } catch (error) {
    if (error instanceof ZodError) {
      const detail = error.issues
        .map((issue) => `${issue.path.join('.') || 'session'}: ${issue.message}`)
        .join('; ');
      throw new AiParseError(
        `Could not map the model output onto a Session (${detail}). Try a clearer description or another photo.`,
      );
    }
    throw error;
  }
}

export function parseModelJson(content: string): unknown {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new AiParseError(
      'Model returned empty output. Try a clearer description or another photo.',
    );
  }

  const attempts = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) attempts.push(fenced[1].trim());
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    attempts.push(trimmed.slice(first, last + 1));
  }

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      // try the next candidate
    }
  }

  throw new AiParseError(
    'Model returned output that is not valid JSON. Try a clearer description or another photo.',
  );
}

function parseStartedAt(value: string | null): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

function fallbackNotes(source: CaptureSource): string {
  if (source === 'photo') return 'Extracted from a training photo. Confirm sport, duration, and intensity.';
  if (source === 'voice') return 'Extracted from a voice note. Confirm details before saving.';
  return 'Structured from text. Edit anything that looks off.';
}
