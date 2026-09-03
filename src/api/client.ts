/**
 * Base HTTP client.
 *
 * - Automatically attaches the stored Bearer token.
 * - On 401: attempts a silent token refresh then retries once.
 *   If the refresh token is also rejected by the server the stored tokens are
 *   cleared so the user is effectively logged out (no stale credentials).
 * - Throws ApiError for non-2xx responses.
 * - 204 No Content returns undefined.
 * - Gives every JSON request a deadline: `fetch` has no timeout of its own, so
 *   a request that never answers left whatever screen was waiting on it stuck
 *   for good — the preferences step holds its Continue button until the stored
 *   preference has been read, and a lost request meant that button never came
 *   back. Uploads are deliberately exempt (see `apiUpload`).
 */
import { API_BASE_URL } from './config';
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from '../storage/authStorage';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    const msg =
      (body as any)?.message ??
      (body as any)?.error ??
      `HTTP ${status}`;
    super(Array.isArray(msg) ? msg.join('; ') : msg);
  }
}

// ─── silent token refresh ─────────────────────────────────────────────────────
// A singleton promise ensures that if multiple requests 401 at the same time
// only one refresh call is made; all waiters get the same result.
let pendingRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = (async () => {
    try {
      const storedRefresh = await getRefreshToken();
      if (!storedRefresh) {
        // No refresh token at all — nothing to do.
        return null;
      }

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });

      if (!res.ok) {
        // Server definitively rejected the refresh token (expired / revoked).
        // Clear storage so the app treats the user as logged-out.
        await clearTokens();
        return null;
      }

      const data = await res.json().catch(() => null);
      const newAccess: string | undefined = data?.session?.accessToken;
      const newRefresh: string | undefined = data?.session?.refreshToken;

      if (!newAccess || !newRefresh) {
        await clearTokens();
        return null;
      }

      await saveTokens(newAccess, newRefresh);
      return newAccess;
    } catch {
      // Network / parse error — don't clear tokens (user may just be offline).
      return null;
    } finally {
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function buildHeaders(
  token: string | null,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── apiRequest ───────────────────────────────────────────────────────────────

/**
 * How long a single JSON request may take before it is abandoned.
 *
 * Long enough to cover a slow mobile network — a cold start on 3G — and short
 * enough that a screen waiting on the answer resolves one way or the other while
 * the user is still looking at it.
 */
export const REQUEST_TIMEOUT_MS = 15000;

/**
 * The deadline for a call that waits on an outside provider before it can
 * answer: Supabase minting or re-reading an auth identity, an SMTP hand-off for
 * a verification email, the SMS gateway taking a code.
 *
 * Those endpoints are not slow because the network is; they are slow because
 * one request is several sequential round trips to services in another region.
 * `/auth/register` alone measures 12–15s — one Supabase `signUp` plus four
 * database round trips — so the default deadline was aborting a signup the
 * server went on to complete, and the user was told the connection had timed
 * out while their account, and its emailed code, existed. Retrying then hit the
 * "already registered" wall.
 *
 * Applied per call rather than raised for everything: a request that only reads
 * our own database should still give up quickly.
 */
export const PROVIDER_TIMEOUT_MS = 45000;

/** 408, the status the request would have got had anyone answered it. */
const TIMEOUT_STATUS = 408;

/** `fetch` with a deadline. Aborting is what makes the promise settle at all. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // A caller's own signal still has to work: this one replaces it on the
  // request, so forward it rather than swallowing it.
  const caller = init.signal;
  if (caller) {
    if (caller.aborted) controller.abort();
    else if (typeof caller.addEventListener === 'function') {
      caller.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    // An abort is this timer's, unless the caller's signal is what fired.
    if ((err as Error)?.name === 'AbortError' && !caller?.aborted) {
      throw new ApiError(TIMEOUT_STATUS, {
        message: 'The connection timed out. Please try again.',
      });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** `RequestInit`, plus the one knob callers here need. */
export interface ApiRequestInit extends RequestInit {
  /**
   * Overrides `REQUEST_TIMEOUT_MS` for this call. Pass
   * `PROVIDER_TIMEOUT_MS` for anything that waits on Supabase, email or SMS.
   */
  timeoutMs?: number;
}

export async function apiRequest<T = void>(
  path: string,
  options: ApiRequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  // Pulled out of the init so it never reaches `fetch` as an unknown option.
  const { timeoutMs, ...init } = options;
  const extraHeaders = init.headers as Record<string, string> | undefined;

  let token = await getAccessToken();
  let response = await fetchWithTimeout(
    url,
    { ...init, headers: buildHeaders(token, extraHeaders) },
    timeoutMs,
  );

  // 401 → attempt one silent refresh then retry.
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      throw new ApiError(401, { message: 'Session expired. Please sign in again.' });
    }
    token = newToken;
    response = await fetchWithTimeout(
      url,
      { ...init, headers: buildHeaders(token, extraHeaders) },
      timeoutMs,
    );
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}

// ─── apiUpload ────────────────────────────────────────────────────────────────
/** Multipart upload — does NOT set Content-Type so fetch can add the boundary. */
export async function apiUpload<T = void>(
  path: string,
  formData: FormData,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const makeHeaders = (t: string | null): Record<string, string> =>
    t ? { Authorization: `Bearer ${t}` } : {};

  let token = await getAccessToken();
  let response = await fetch(url, {
    method: 'POST',
    headers: makeHeaders(token),
    body: formData,
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      throw new ApiError(401, { message: 'Session expired. Please sign in again.' });
    }
    token = newToken;
    response = await fetch(url, {
      method: 'POST',
      headers: makeHeaders(token),
      body: formData,
    });
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}
