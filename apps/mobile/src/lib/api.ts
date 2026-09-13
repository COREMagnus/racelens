import type {
  AnalyzeSessionRequest,
  AthleteProfile,
  AthleteSnapshot,
  AuthSessionResponse,
  CoachChatRequest,
  CoachChatResponse,
  Session,
  WeekPlan,
} from '@racelens/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

let authToken: string | null = null;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  if (init?.headers) {
    const extra = init.headers as Record<string, string>;
    for (const [key, value] of Object.entries(extra)) {
      headers[key] = value;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, errorMessage(body, response.statusText));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function errorMessage(body: string, fallback: string): string {
  if (!body) return fallback;
  try {
    const json = JSON.parse(body) as { error?: string };
    if (typeof json.error === 'string' && json.error) return json.error;
  } catch {
    // keep raw body
  }
  return body;
}

export function getHealth(): Promise<{
  ok: boolean;
  service: string;
  ai: string;
  aiAccess?: string;
  auth?: string;
  database?: string;
}> {
  return request('/health');
}

export function getWeekPlan(): Promise<WeekPlan> {
  return request('/plan/week');
}

export function analyzeSession(body: AnalyzeSessionRequest): Promise<Session> {
  return request('/sessions/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function chatWithCoach(body: CoachChatRequest): Promise<CoachChatResponse> {
  return request('/coach/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function registerAccount(email: string, password: string): Promise<AuthSessionResponse> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function loginAccount(email: string, password: string): Promise<AuthSessionResponse> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logoutAccount(): Promise<{ ok: boolean }> {
  return request('/auth/logout', { method: 'POST' });
}

export function getMe(): Promise<AthleteSnapshot> {
  return request('/me');
}

export function putAthleteProfile(
  profile: AthleteProfile,
): Promise<{ profile: AthleteProfile; plan: WeekPlan | null }> {
  return request('/me/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

export function postLoggedSession(session: Session): Promise<Session> {
  return request('/me/sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });
}

export function putWeekPlan(plan: WeekPlan | null): Promise<{ plan: WeekPlan | null }> {
  return request('/me/plan', {
    method: 'PUT',
    body: JSON.stringify({ plan }),
  });
}

export { API_URL };
