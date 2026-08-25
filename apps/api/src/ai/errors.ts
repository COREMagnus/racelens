export class AiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

/** Missing or invalid local AI configuration (no API key). */
export class AiConfigError extends AiError {
  constructor(message: string) {
    super('ai_unconfigured', message);
  }
}

/** Caller sent a payload we cannot interpret. */
export class AiRequestError extends AiError {
  constructor(message: string) {
    super('ai_bad_request', message);
  }
}

/** Model returned output that could not be mapped onto our schema. */
export class AiParseError extends AiError {
  constructor(message: string) {
    super('ai_unparseable', message);
  }
}

/** OpenAI (or network) failed while calling a model. */
export class AiUpstreamError extends AiError {
  constructor(message: string) {
    super('ai_upstream', message);
  }
}

export function httpStatusForAiError(error: unknown): { status: number; error: string } {
  if (error instanceof AiConfigError) {
    return { status: 503, error: error.message };
  }
  if (error instanceof AiRequestError) {
    return { status: 400, error: error.message };
  }
  if (error instanceof AiParseError) {
    return { status: 422, error: error.message };
  }
  if (error instanceof AiUpstreamError) {
    return { status: 502, error: error.message };
  }
  if (error instanceof Error) {
    return { status: 500, error: error.message };
  }
  return { status: 500, error: 'Unexpected AI error' };
}
