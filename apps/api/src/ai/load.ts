import type { Intensity } from '@racelens/shared';

/** Simple duration × intensity load used when the model omits or zeros load. */
export function loadFactor(intensity: Intensity): number {
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

export function estimateLoad(durationMin: number, intensity: Intensity): number {
  return Math.round(durationMin * loadFactor(intensity));
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
