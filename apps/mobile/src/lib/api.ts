import type {
  AnalyzeSessionRequest,
  CoachChatRequest,
  CoachChatResponse,
  Session,
  WeekPlan,
} from '@racelens/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body || response.statusText}`);
  }

  return (await response.json()) as T;
}

export function getHealth(): Promise<{ ok: boolean; service: string; ai: string }> {
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

export { API_URL };
