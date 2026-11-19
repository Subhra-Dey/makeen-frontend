/** A failed API call, carrying the API's error envelope `{ code, message, details?, requestId }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Per-field messages from a VALIDATION_FAILED envelope (`details: [{ path, message }]`). */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (!Array.isArray(this.details)) return out;
    for (const d of this.details as unknown[]) {
      if (d !== null && typeof d === 'object') {
        const path: unknown = Reflect.get(d, 'path');
        const message: unknown = Reflect.get(d, 'message');
        if (typeof path === 'string' && typeof message === 'string' && !(path in out)) {
          out[path] = message;
        }
      }
    }
    return out;
  }
}

/** The session could not be renewed; the person must sign in again. */
export class SessionEndedError extends ApiError {
  constructor() {
    super(401, 'UNAUTHENTICATED', 'Your session has ended. Please sign in again.', undefined, null);
    this.name = 'SessionEndedError';
  }
}

export const NETWORK_MESSAGE =
  'The portal could not be reached. Check your connection and try again.';

export async function toApiError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  const get = (k: string): unknown =>
    body !== null && typeof body === 'object' ? Reflect.get(body, k) : undefined;
  const code = get('code');
  const message = get('message');
  const requestId = get('requestId');
  return new ApiError(
    res.status,
    typeof code === 'string' ? code : 'HTTP_' + String(res.status),
    typeof message === 'string' ? message : 'Something went wrong. Please try again.',
    get('details'),
    typeof requestId === 'string' ? requestId : null,
  );
}
