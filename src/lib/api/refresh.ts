import { ensureCsrf } from './csrf';

/**
 * Single-flight session refresh (D-65). The API treats a replayed refresh token as theft and
 * ends the whole session, so two refreshes must never race:
 *  - in one tab, every caller shares one in-flight promise;
 *  - across tabs, the Web Locks API serialises refreshes, and a tab that waited for the lock skips
 *    its own refresh when another tab renewed the cookies a moment ago (the cookies are shared).
 */
const LOCK = 'mk-session-refresh';
const STAMP = 'mk-refreshed-at';
const FRESH_MS = 10_000;

let inFlight: Promise<boolean> | null = null;

function refreshedRecently(): boolean {
  try {
    const at = Number(window.localStorage.getItem(STAMP) ?? '0');
    return Date.now() - at < FRESH_MS;
  } catch {
    return false;
  }
}

function stamp(): void {
  try {
    window.localStorage.setItem(STAMP, String(Date.now()));
  } catch {
    /* storage unavailable: the lock alone still serialises */
  }
}

async function doRefresh(): Promise<boolean> {
  if (refreshedRecently()) return true;
  const csrf = await ensureCsrf();
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-CSRF-Token': csrf },
  });
  if (res.ok) stamp();
  return res.ok;
}

/** Renew the session once; resolves true when the cookies were (or just had been) renewed. */
export function refreshSession(): Promise<boolean> {
  inFlight ??= (async () => {
    try {
      const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
      return locks ? await locks.request(LOCK, doRefresh) : await doRefresh();
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** For tests only: forget the shared promise. */
export function resetRefreshForTests(): void {
  inFlight = null;
}
