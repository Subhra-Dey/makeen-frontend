import type { NextConfig } from 'next';

/**
 * The web app runs on its own server. The browser only ever talks to this origin; `src/proxy.ts`
 * forwards `/api/*` server-to-server to the API (`API_INTERNAL_URL`, read at RUNTIME — not via
 * `rewrites()`, which Next.js bakes in at build time), so auth cookies stay first-party and the API
 * never has to be exposed publicly (DECISIONS D-44).
 */
const isProd = process.env.NODE_ENV === 'production';

// Static hardening headers. The nonce-based CSP is set per request in `src/proxy.ts`.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server bundle (.next/standalone/server.js) for deploying the web app on its own.
  // Pin the roots to this folder: web/ is fully self-contained and can be moved anywhere.
  output: 'standalone',
  outputFileTracingRoot: import.meta.dirname,
  // cacheComponents / Partial Prerendering are intentionally OFF: they are incompatible with the
  // nonce-based CSP the brief requires (Next.js CSP guide; DECISIONS D-45).
  images: { formats: ['image/avif', 'image/webp'] },
  experimental: {
    // Proxy buffers request bodies and silently TRUNCATES above this size. Uploads are ≤ 10 MB plus
    // multipart overhead; anything larger still reaches the API above its 10 MB cap and gets a 413.
    proxyClientMaxBodySize: '12mb',
  },
  turbopack: {
    root: import.meta.dirname,
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: securityHeaders }]);
  },
};

export default nextConfig;
