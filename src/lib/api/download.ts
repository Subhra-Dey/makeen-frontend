import { ApiError, NETWORK_MESSAGE, SessionEndedError, toApiError } from './errors';
import { refreshSession } from './refresh';

function fileNameOf(res: Response, fallback: string): string {
  const cd = res.headers.get('Content-Disposition') ?? '';
  const m = /filename="([^"]+)"/.exec(cd);
  return m?.[1] ?? fallback;
}

/**
 * Download a report file (Excel / PDF) through the same-origin proxy, renewing the session once
 * on 401 like `api()`. The file is handed to the browser as a download, never opened inline.
 */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  if (!path.startsWith('/api/')) throw new RangeError('API paths start with /api/');
  const get = (): Promise<Response> =>
    fetch(path, { credentials: 'same-origin', cache: 'no-store' }).catch(() => {
      throw new ApiError(0, 'NETWORK', NETWORK_MESSAGE, undefined, null);
    });
  let res = await get();
  if (res.status === 401) {
    if (await refreshSession()) res = await get();
    if (res.status === 401) throw new SessionEndedError();
  }
  if (!res.ok) throw await toApiError(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileNameOf(res, fallbackName);
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10_000);
  }
}
