/**
 * Where to go after sign-in. Only same-site paths are accepted, so a crafted `?next=` can never
 * send someone to another site (open redirect).
 */
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (next.startsWith('/login') || next.startsWith('/change-password')) return fallback;
  try {
    const u = new URL(next, 'https://portal.invalid');
    if (u.origin !== 'https://portal.invalid') return fallback;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }
}

/** Login URL that brings the person back to where they were. */
export function loginUrl(currentPath: string): string {
  const next = safeNext(currentPath, '');
  return next ? `/login?next=${encodeURIComponent(next)}` : '/login';
}
