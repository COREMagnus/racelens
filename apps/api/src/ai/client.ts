import OpenAI, { toFile } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { ZodError } from 'zod';

import { AiConfigError, AiParseError, AiUpstreamError } from './errors';
import { filenameForAudioMime } from './payload';
import { parseModelJson } from './map-session';
import { resolveModels } from './models';
import { sessionExtractionSchema, type SessionExtraction } from './schema';

export type ChatMessage = ChatCompletionMessageParam;

export interface TranscribeInput {
  buffer: Buffer;
  filename: string;
  mime: string;
}

export interface AiClient {
  parseSession(input: {
    messages: ChatMessage[];
    model: string;
  }): Promise<SessionExtraction>;
  completeCoach(input: { messages: ChatMessage[]; model: string }): Promise<string>;
  transcribe(input: TranscribeInput): Promise<string>;
}

export function isOpenAiConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OPENAI_API_KEY?.trim());
}

export function requireOpenAiKey(env: NodeJS.ProcessEnv = process.env): string {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new AiConfigError(
      'OPENAI_API_KEY is not set. Add it to apps/api/.env to enable session analyze and coach.',
    );
  }
  return key;
}

export function createOpenAiClient(
  options: { sdk?: OpenAI; env?: NodeJS.ProcessEnv } = {},
): AiClient {
  const env = options.env ?? process.env;
  const sdk = options.sdk ?? new OpenAI({ apiKey: requireOpenAiKey(env) });
  const models = resolveModels(env);

  return {
    async parseSession({ messages, model }) {
      try {
        const completion = await sdk.chat.completions.parse({
          model,
          messages,
          temperature: 0.2,
          response_format: zodResponseFormat(sessionExtractionSchema, 'session_extraction'),
        });
        const message = completion.choices[0]?.message;
        if (message?.refusal) {
          throw new AiParseError(
            `Could not extract a session: ${message.refusal}`,
          );
        }
        if (message?.parsed) {
          return message.parsed;
        }
        if (message?.content) {
          return sessionExtractionSchema.parse(parseModelJson(message.content));
        }
        throw new AiParseError(
          'Model returned an empty session. Try a clearer description or another photo.',
        );
      } catch (error) {
        throw translateModelError(error, 'session');
      }
    },

    async completeCoach({ messages, model }) {
      try {
        const completion = await sdk.chat.completions.create({
          model,
          messages,
          temperature: 0.5,
          max_tokens: 500,
        });
        const text = completion.choices[0]?.message?.content?.trim();
        if (!text) {
          throw new AiParseError('Coach returned an empty reply. Try again.');
        }
        return text;
      } catch (error) {
        throw translateModelError(error, 'coach');
      }
    },

    async transcribe({ buffer, filename, mime }) {
      try {
        const file = await toFile(buffer, filename || filenameForAudioMime(mime));
        const result = await sdk.audio.transcriptions.create({
          model: models.transcribe,
          file,
        });
        const text = typeof result === 'string' ? result : result.text;
        if (!text?.trim()) {
          throw new AiParseError(
            'Transcription was empty. Try a clearer voice note or send the transcript as text.',
          );
        }
        return text.trim();
      } catch (error) {
        throw translateModelError(error, 'transcription');
      }
    },
  };
}

function translateModelError(error: unknown, surface: 'session' | 'coach' | 'transcription'): never {
  if (
    error instanceof AiParseError ||
    error instanceof AiConfigError ||
    error instanceof AiUpstreamError
  ) {
    throw error;
  }
  if (error instanceof ZodError) {
    const detail = error.issues
      .map((issue) => `${issue.path.join('.') || 'output'}: ${issue.message}`)
      .join('; ');
    throw new AiParseError(
      `Could not map the model output onto a Session (${detail}). Try a clearer description or another photo.`,
    );
  }

  const raw = error instanceof Error ? error.message : 'OpenAI request failed';
  const sanitized = raw.replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-***');
  const hint =
    surface === 'transcription'
      ? 'Voice transcription failed'
      : surface === 'coach'
        ? 'Coach model call failed'
        : 'Session analysis failed';
  throw new AiUpstreamError(`${hint}: ${sanitized}`);
}
