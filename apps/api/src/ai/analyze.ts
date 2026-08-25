import type { AnalyzeSessionRequest, Session } from '@racelens/shared';

import { resolveLimits } from '../lib/env';
import { createId } from '../lib/id';
import { createOpenAiClient, type AiClient, type ChatMessage } from './client';
import { AiRequestError } from './errors';
import { sessionFromModelOutput } from './map-session';
import { resolveModels } from './models';
import {
  classifyAnalyzePayload,
  decodeDataUri,
  filenameForAudioMime,
} from './payload';
import { ANALYZE_SYSTEM_PROMPT, analyzeUserPrompt } from './prompts';
import { assertAnalyzeText } from './request-schema';

export async function analyzeSession(
  request: AnalyzeSessionRequest,
  options: {
    client?: AiClient;
    now?: Date;
    id?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<Session> {
  const env = options.env ?? process.env;
  const limits = resolveLimits(env);
  const classified = classifyAnalyzePayload(request.type, request.payload, {
    maxPayloadChars: limits.maxPayloadChars,
    maxMediaBytes: limits.maxMediaBytes,
  });

  const messages: ChatMessage[] = [{ role: 'system', content: ANALYZE_SYSTEM_PROMPT }];
  const models = resolveModels(env);
  let model = models.text;

  const client = (): AiClient => options.client ?? createOpenAiClient({ env });

  if (classified.kind === 'audio') {
    const decoded = decodeDataUri(classified.dataUri);
    if (decoded.buffer.length === 0) {
      throw new AiRequestError('Audio data URI decoded to empty bytes.');
    }
    if (decoded.buffer.length > limits.maxMediaBytes) {
      throw new AiRequestError(`Audio exceeds the ${limits.maxMediaBytes} byte limit.`);
    }
    const userText = await client().transcribe({
      buffer: decoded.buffer,
      mime: decoded.mime,
      filename: filenameForAudioMime(decoded.mime),
    });
    assertAnalyzeText(userText, limits.maxAnalyzeTextChars);
    messages.push({
      role: 'user',
      content: analyzeUserPrompt('voice', userText),
    });
  } else if (classified.kind === 'image') {
    assertAnalyzeText(classified.hint, limits.maxAnalyzeTextChars);
    model = models.vision;
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: analyzeUserPrompt('photo', classified.hint) },
        { type: 'image_url', image_url: { url: classified.imageUrl } },
      ],
    });
  } else {
    if (!classified.text.trim()) {
      throw new AiRequestError('payload must be a non-empty string');
    }
    assertAnalyzeText(classified.text, limits.maxAnalyzeTextChars);
    messages.push({
      role: 'user',
      content: analyzeUserPrompt(request.type, classified.text),
    });
  }

  const extracted = await client().parseSession({ messages, model });
  return sessionFromModelOutput(extracted, request.type, {
    id: options.id ?? createId('ses'),
    ...(options.now ? { now: options.now } : {}),
  });
}
