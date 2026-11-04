const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'whisper_token';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public data?: Record<string, unknown>) {
    super(message);
  }
}

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Can’t reach Whisper right now. Check your connection and try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (json as { error?: { code?: string; message?: string } }).error ?? {};
    throw new ApiError(res.status, e.code ?? 'ERROR', e.message ?? 'Something went wrong.', e as Record<string, unknown>);
  }
  return json as T;
}

export const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
