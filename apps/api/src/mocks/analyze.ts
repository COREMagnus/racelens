import type {
  AnalyzeSessionRequest,
  Intensity,
  Session,
  Sport,
} from '@racelens/shared';

import { createId } from '../lib/id';

/**
 * TODO(ai): Replace this heuristic stub with a real vision / speech / LLM
 * pipeline (watch-screen OCR, whiteboard photo, voice transcription, then
 * structured extraction). OPENAI_API_KEY is reserved for that work.
 */
export function analyzeSessionMock(request: AnalyzeSessionRequest): Session {
  const text = request.payload.toLowerCase();
  const sport = detectSport(text);
  const durationMin = detectDuration(text);
  const intensity = detectIntensity(text);
  const rpe = detectRpe(text, intensity);
  const load = Math.round(durationMin * loadFactor(intensity));

  return {
    id: createId('ses'),
    sport,
    startedAt: new Date().toISOString(),
    durationMin,
    intensity,
    load,
    rpe,
    notes: buildNotes(request),
    source: request.type,
  };
}

function detectSport(text: string): Sport {
  if (/\bbrick\b/.test(text)) return 'brick';
  if (/\b(swim|pool|ows|open water)\b/.test(text)) return 'swim';
  if (/\b(bike|ride|watt|ftp|trainer)\b/.test(text)) return 'bike';
  if (/\b(run|jog|tempo|track)\b/.test(text)) return 'run';
  return 'run';
}

function detectDuration(text: string): number {
  const hoursMins = text.match(/(\d+)\s*h(?:ours?)?\s*(\d+)\s*m/);
  if (hoursMins) {
    return Number(hoursMins[1]) * 60 + Number(hoursMins[2]);
  }

  const minutes = text.match(/(\d+(?:\.\d+)?)\s*(?:min|minutes?)\b/);
  if (minutes) {
    return Math.round(Number(minutes[1]));
  }

  const hours = text.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?\b/);
  if (hours) {
    return Math.round(Number(hours[1]) * 60);
  }

  return 45;
}

function detectIntensity(text: string): Intensity {
  const zone = text.match(/\bz\s*([1-5])\b/);
  if (zone) {
    return `z${zone[1]}` as Intensity;
  }
  if (/\b(easy|recovery|z1)\b/.test(text)) return 'easy';
  if (/\b(hard|threshold|vo2|race)\b/.test(text)) return 'hard';
  if (/\b(mod|moderate|steady|tempo)\b/.test(text)) return 'mod';
  return 'mod';
}

function detectRpe(text: string, intensity: Intensity): number {
  const explicit = text.match(/\brpe\s*[:=]?\s*(\d{1,2})\b/);
  if (explicit) {
    return clampRpe(Number(explicit[1]));
  }

  switch (intensity) {
    case 'z1':
    case 'easy':
      return 3;
    case 'z2':
      return 4;
    case 'z3':
    case 'mod':
      return 6;
    case 'z4':
      return 7;
    case 'z5':
    case 'hard':
      return 8;
  }
}

function loadFactor(intensity: Intensity): number {
  switch (intensity) {
    case 'z1':
    case 'easy':
      return 0.6;
    case 'z2':
      return 0.75;
    case 'z3':
    case 'mod':
      return 1;
    case 'z4':
      return 1.25;
    case 'z5':
    case 'hard':
      return 1.5;
  }
}

function clampRpe(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value)));
}

function buildNotes(request: AnalyzeSessionRequest): string {
  const stubTag = '[mock AI]';
  if (request.type === 'photo') {
    return `${stubTag} Parsed watch / whiteboard capture. Confirm sport, duration, and intensity.`;
  }
  if (request.type === 'voice') {
    return `${stubTag} Used voice capture as a transcript stand-in. Confirm details before saving.`;
  }
  return `${stubTag} Structured from text. Edit anything that looks off.`;
}
