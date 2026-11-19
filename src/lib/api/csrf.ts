/**
 * Double-submit CSRF (D-66): the API sets a JS-readable cookie and expects the same value in the
 * `X-CSRF-Token` header on every state-changing request — sign-in included.
 * Production cookie: `__Host-mk_csrf`; plain-http development: `mk_csrf`.
 */
const NAMES = ['__Host-mk_csrf', 'mk_csrf'] as const;

export function readCsrfCookie(cookie: string = document.cookie): string | null {
  for (const part of cookie.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName !== undefined && (NAMES as readonly string[]).includes(rawName)) {
      const value = decodeURIComponent(rest.join('='));
      if (value.length > 0) return value;
    }
  }
  return null;
}

/** The CSRF token, fetching a fresh cookie from the API when none is set yet. */
export async function ensureCsrf(): Promise<string> {
  const existing = readCsrfCookie();
  if (existing !== null) return existing;
  const res = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  const body: unknown = await res.json().catch(() => null);
  const token: unknown =
    body !== null && typeof body === 'object' ? Reflect.get(body, 'csrfToken') : undefined;
  return readCsrfCookie() ?? (typeof token === 'string' ? token : '');
}
