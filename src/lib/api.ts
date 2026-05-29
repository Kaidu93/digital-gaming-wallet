import { env } from '@/lib/env';
import { useAuth } from '@/stores/auth';

export interface ApiError {
  status: number;
  message: string;
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    'message' in err
  );
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuth.getState().token;

  const response = await fetch(`${env.API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      if (typeof body?.message === 'string') {
        message = body.message;
      }
    } catch {
      // empty because statusText fallback is already set
    }

    if (response.status === 401) {
      useAuth.getState().logout();
    }

    throw { status: response.status, message } satisfies ApiError;
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T = unknown>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),

  delete: <T = unknown>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
