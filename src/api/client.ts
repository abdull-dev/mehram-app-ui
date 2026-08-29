/**
 * Base HTTP client.
 *
 * - Automatically attaches the stored Bearer token.
 * - On 401: attempts a silent token refresh then retries once.
 *   If the refresh token is also rejected by the server the stored tokens are
 *   cleared so the user is effectively logged out (no stale credentials).
 * - Throws ApiError for non-2xx responses.
 * - 204 No Content returns undefined.
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
export async function apiRequest<T = void>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const extraHeaders = options.headers as Record<string, string> | undefined;

  let token = await getAccessToken();
  let response = await fetch(url, {
    ...options,
    headers: buildHeaders(token, extraHeaders),
  });

  // 401 → attempt one silent refresh then retry.
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      throw new ApiError(401, { message: 'Session expired. Please sign in again.' });
    }
    token = newToken;
    response = await fetch(url, {
      ...options,
      headers: buildHeaders(token, extraHeaders),
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
