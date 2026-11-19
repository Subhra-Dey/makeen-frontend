import { ensureCsrf } from './csrf';
import { ApiError, NETWORK_MESSAGE, SessionEndedError, toApiError } from './errors';
import { refreshSession } from './refresh';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** JSON body. */
  body?: unknown;
  /** Multipart body (file uploads); takes precedence over `body`. */
  form?: FormData;
  signal?: AbortSignal;
  /**
   * Do not renew an expired access token (auth screens probing for a session). The default is
   * to refresh once and retry.
   */
  noRefresh?: boolean;
}

/** Called when the session has finally ended (set by the session provider to open Login). */
let onSessionEnded: (() => void) | null = null;
export function setSessionEndedHandler(fn: (() => void) | null): void {
  onSessionEnded = fn;
}

async function send(path: string, opts: ApiOptions): Promise<Response> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRF-Token'] = await ensureCsrf();
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  try {
    return await fetch(path, {
      method,
      headers,
      body,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: opts.signal,
    });
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, 'NETWORK', NETWORK_MESSAGE, undefined, null);
  }
}

/**
 * Call the API through the web server's same-origin `/api/*` proxy. Tokens live in HttpOnly
 * cookies only (SEC-3); this never sees them. A 401 renews the session once (single-flight)
 * and retries; a second 401 ends the session.
 */
export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  if (!path.startsWith('/api/')) throw new RangeError('API paths start with /api/');
  let res = await send(path, opts);
  if (res.status === 401 && !opts.noRefresh && !path.startsWith('/api/auth/')) {
    if (await refreshSession()) res = await send(path, opts);
    if (res.status === 401) {
      onSessionEnded?.();
      throw new SessionEndedError();
    }
  }
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
