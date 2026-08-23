import type { AnalyzeSessionRequest, Session } from '@racelens/shared';

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

export async function analyzeSession(
  request: AnalyzeSessionRequest,
  options: {
    client?: AiClient;
    now?: Date;
    id?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<Session> {
  const client = options.client ?? createOpenAiClient();
  const models = resolveModels();
  const classified = classifyAnalyzePayload(request.type, request.payload);

  let userText = '';
  const messages: ChatMessage[] = [{ role: 'system', content: ANALYZE_SYSTEM_PROMPT }];
  let model = models.text;

  if (classified.kind === 'audio') {
    const audio = await loadAudio(classified, options.fetchImpl ?? fetch);
    userText = await client.transcribe(audio);
    messages.push({
      role: 'user',
      content: analyzeUserPrompt('voice', userText),
    });
  } else if (classified.kind === 'image') {
    model = models.vision;
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: analyzeUserPrompt('photo', classified.hint) },
        { type: 'image_url', image_url: { url: classified.imageUrl } },
      ],
    });
  } else {
    userText = classified.text;
    if (!userText.trim()) {
      throw new AiRequestError('payload must be a non-empty string');
    }
    messages.push({
      role: 'user',
      content: analyzeUserPrompt(request.type, userText),
    });
  }

  const extracted = await client.parseSession({ messages, model });
  return sessionFromModelOutput(extracted, request.type, {
    id: options.id ?? createId('ses'),
    ...(options.now ? { now: options.now } : {}),
  });
}

async function loadAudio(
  ref: Extract<ReturnType<typeof classifyAnalyzePayload>, { kind: 'audio' }>,
  fetchImpl: typeof fetch,
): Promise<{ buffer: Buffer; filename: string; mime: string }> {
  if (ref.source === 'data-uri' && ref.dataUri) {
    const decoded = decodeDataUri(ref.dataUri);
    return {
      buffer: decoded.buffer,
      mime: decoded.mime,
      filename: filenameForAudioMime(decoded.mime),
    };
  }
  if (ref.url) {
    const response = await fetchImpl(ref.url);
    if (!response.ok) {
      throw new AiRequestError(`Could not download audio from URL (HTTP ${response.status}).`);
    }
    const mime = response.headers.get('content-type')?.split(';')[0]?.trim() || ref.mime;
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, mime, filename: filenameForAudioMime(mime) };
  }
  throw new AiRequestError('Voice audio payload was missing bytes.');
}
