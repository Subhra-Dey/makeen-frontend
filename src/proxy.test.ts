import { describe, expect, it } from 'vitest';
import { apiUpstreamUrl, buildCsp } from './proxy';

describe('API forwarding to the separate API server', () => {
  const upstream = 'http://10.0.1.20:4000';

  it('keeps path and query and targets the private API address', () => {
    expect(apiUpstreamUrl('/api/ready', '?x=1', upstream).href).toBe(
      'http://10.0.1.20:4000/api/ready?x=1',
    );
  });

  it('cannot be redirected to another host by the request path', () => {
    expect(apiUpstreamUrl('/api//evil.example/x', '', upstream).host).toBe('10.0.1.20:4000');
    expect(apiUpstreamUrl('/api/@evil.example', '', upstream).host).toBe('10.0.1.20:4000');
  });

  it('only forwards /api/* paths', () => {
    expect(() => apiUpstreamUrl('/dashboard', '', upstream)).toThrow(RangeError);
  });
});

describe('CSP', () => {
  it('is nonce-based and locks down framing, objects and base-uri in production', () => {
    const csp = buildCsp('abc123', false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('allows eval and websockets only in development (React dev tooling, HMR)', () => {
    const csp = buildCsp('n', true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain('ws:');
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});
