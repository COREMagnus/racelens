import {
  INTENSITY_FEELS,
  INTENSITY_ZONES,
  SPORTS,
} from '@racelens/shared';
import { z } from 'zod';

const intensityValues = [...INTENSITY_ZONES, ...INTENSITY_FEELS] as [
  (typeof INTENSITY_ZONES)[number] | (typeof INTENSITY_FEELS)[number],
  ...((typeof INTENSITY_ZONES)[number] | (typeof INTENSITY_FEELS)[number])[],
];

const sportValues = [...SPORTS] as [
  (typeof SPORTS)[number],
  ...(typeof SPORTS)[number][],
];

/**
 * Model-facing extraction shape. `id` / `source` are assigned by the API.
 * Structured Outputs require every field; use null for unknowns.
 */
export const sessionExtractionSchema = z.object({
  sport: z.enum(sportValues),
  durationMin: z.number(),
  intensity: z.enum(intensityValues),
  load: z.number().nullable(),
  rpe: z.number(),
  notes: z.string(),
  startedAt: z.string().nullable(),
});

export type SessionExtraction = z.infer<typeof sessionExtractionSchema>;

export function parseSessionExtraction(value: unknown): SessionExtraction {
  return sessionExtractionSchema.parse(value);
}
