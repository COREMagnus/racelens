export const DEFAULT_TEXT_MODEL = 'gpt-4.1-mini';
export const DEFAULT_VISION_MODEL = 'gpt-4o-mini';
export const DEFAULT_TRANSCRIBE_MODEL = 'whisper-1';

export function resolveModels(env: NodeJS.ProcessEnv = process.env): {
  text: string;
  vision: string;
  transcribe: string;
} {
  return {
    text: env.OPENAI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL,
    vision: env.OPENAI_VISION_MODEL?.trim() || DEFAULT_VISION_MODEL,
    transcribe: env.OPENAI_TRANSCRIBE_MODEL?.trim() || DEFAULT_TRANSCRIBE_MODEL,
  };
}
