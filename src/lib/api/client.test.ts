import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, setSessionEndedHandler } from './client';
import { readCsrfCookie } from './csrf';
import { ApiError, SessionEndedError } from './errors';
import { refreshSession, resetRefreshForTests } from './refresh';

type Handler = (url: string, init: RequestInit | undefined) => Response;

function json(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let calls: { url: string; init: RequestInit | undefined }[] = [];

function mockFetch(handler: Handler): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, init });
      return Promise.resolve(handler(url, init));
    }),
  );
}

beforeEach(() => {
  calls = [];
  resetRefreshForTests();
  vi.stubGlobal('document', { cookie: 'other=1; mk_csrf=tok123' });
  const store = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    },
  });
  vi.stubGlobal('navigator', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  setSessionEndedHandler(null);
});

describe('CSRF cookie', () => {
  it('reads the dev and the __Host- production names', () => {
    expect(readCsrfCookie('a=1; mk_csrf=abc')).toBe('abc');
    expect(readCsrfCookie('__Host-mk_csrf=xyz; b=2')).toBe('xyz');
    expect(readCsrfCookie('a=1')).toBeNull();
  });
});

describe('api()', () => {
  it('sends the CSRF header on state-changing calls only, and JSON bodies', async () => {
    mockFetch(() => json(200, { ok: true }));
    await api('/api/x');
    await api('/api/x', { method: 'POST', body: { a: 1 } });
    const get = calls[0]?.init?.headers as Record<string, string>;
    const post = calls[1]?.init?.headers as Record<string, string>;
    expect(get['X-CSRF-Token']).toBeUndefined();
    expect(post['X-CSRF-Token']).toBe('tok123');
    expect(post['Content-Type']).toBe('application/json');
    expect(calls[1]?.init?.body).toBe('{"a":1}');
    expect(calls[1]?.init?.credentials).toBe('same-origin');
  });

  it('turns the error envelope into an ApiError with field errors', async () => {
    mockFetch(() =>
      json(400, {
        code: 'VALIDATION_FAILED',
        message: 'Some fields are not valid.',
        details: [{ path: 'email', message: 'Enter your email.' }],
        requestId: 'r1',
      }),
    );
    const err = await api('/api/x', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).fieldErrors()).toEqual({ email: 'Enter your email.' });
    expect((err as ApiError).requestId).toBe('r1');
  });

  it('on 401 refreshes once and retries the call', async () => {
    let me = 0;
    mockFetch((url) => {
      if (url === '/api/auth/refresh') return json(204, undefined);
      me += 1;
      return me === 1
        ? json(401, { code: 'UNAUTHENTICATED', message: 'Please sign in.' })
        : json(200, { id: 'u' });
    });
    await expect(api('/api/me')).resolves.toEqual({ id: 'u' });
    expect(calls.map((c) => c.url)).toEqual(['/api/me', '/api/auth/refresh', '/api/me']);
  });

  it('ends the session when the refresh fails', async () => {
    const ended = vi.fn();
    setSessionEndedHandler(ended);
    mockFetch((url) =>
      url === '/api/auth/refresh'
        ? json(401, { code: 'UNAUTHENTICATED', message: 'x' })
        : json(401, { code: 'UNAUTHENTICATED', message: 'x' }),
    );
    await expect(api('/api/me')).rejects.toBeInstanceOf(SessionEndedError);
    expect(ended).toHaveBeenCalledOnce();
  });

  it('never refreshes for auth routes or when told not to', async () => {
    mockFetch(() =>
      json(401, { code: 'INVALID_CREDENTIALS', message: 'Email or password is wrong.' }),
    );
    await expect(api('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    await expect(api('/api/me', { noRefresh: true })).rejects.toMatchObject({ status: 401 });
    expect(calls.some((c) => c.url === '/api/auth/refresh')).toBe(false);
  });

  it('refuses paths outside /api/', async () => {
    await expect(api('https://evil.example/x')).rejects.toBeInstanceOf(RangeError);
  });
});

describe('single-flight refresh (D-65)', () => {
  it('shares one refresh between concurrent callers', async () => {
    let release: (r: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        calls.push({ url, init: undefined });
        return new Promise<Response>((res) => {
          release = res;
        });
      }),
    );
    const a = refreshSession();
    const b = refreshSession();
    await Promise.resolve();
    await Promise.resolve();
    release(json(204, undefined));
    await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
    expect(calls.filter((c) => c.url === '/api/auth/refresh')).toHaveLength(1);
  });

  it('skips a refresh another tab completed seconds ago, and uses Web Locks when present', async () => {
    const request = vi.fn((_name: string, fn: () => Promise<boolean>) => fn());
    vi.stubGlobal('navigator', { locks: { request } });
    mockFetch(() => json(204, undefined));
    await refreshSession();
    expect(request).toHaveBeenCalledWith('mk-session-refresh', expect.any(Function));
    resetRefreshForTests();
    await refreshSession();
    expect(calls.filter((c) => c.url === '/api/auth/refresh')).toHaveLength(1);
  });
});
