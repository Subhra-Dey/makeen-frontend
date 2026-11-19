import { type NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/lib/env.server';

/**
 * Per-request nonce-based Content-Security-Policy (SEC-16).
 * Next.js reads the nonce from the request CSP header and applies it to its own scripts.
 * `style-src 'unsafe-inline'` is kept because Radix/Recharts set inline style attributes,
 * which nonces cannot cover (DECISIONS D-39). Scripts stay nonce-only.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'blob:', 'data:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(isDev ? ['ws:'] : [])],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`);
  if (!isDev) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}

/**
 * Upstream URL for a browser `/api/*` request. The API server is reached over the private network.
 * Resolved per request from runtime env, so one built image works for every deployment (D-44).
 */
export function apiUpstreamUrl(pathname: string, search: string, apiInternalUrl: string): URL {
  if (!pathname.startsWith('/api/')) throw new RangeError('Not an API path');
  return new URL(`${pathname}${search}`, apiInternalUrl);
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  // 1) Same-origin API: forward to the API server; cookies stay first-party to this origin.
  if (pathname.startsWith('/api/')) {
    return NextResponse.rewrite(apiUpstreamUrl(pathname, search, serverEnv().API_INTERNAL_URL));
  }

  // 2) Pages: fresh CSP nonce per request.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    {
      source: '/((?!api|_next/static|_next/image|images|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
