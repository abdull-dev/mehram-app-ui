/**
 * `fetch` has no timeout of its own, so a request that never answered never
 * settled — and a screen holding a control until its read lands held it
 * forever. The preferences step disables Continue until the stored preference
 * has been read, which is where that showed up.
 */
import { ApiError, REQUEST_TIMEOUT_MS, apiRequest } from '../src/api/client';

jest.mock('../src/storage/authStorage', () => ({
  getAccessToken: jest.fn().mockResolvedValue('token'),
  getRefreshToken: jest.fn().mockResolvedValue('refresh'),
  saveTokens: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}));

const fetchMock = jest.fn();
// No @types/node here, so reach the global through globalThis.
(globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

/** A fetch that only ever settles when its signal aborts, like a lost request. */
function hangingFetch() {
  return jest.fn(
    (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        const fail = () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        };
        // A real fetch rejects at once on a signal that is already aborted,
        // rather than waiting for an event that has been and gone.
        if (init.signal.aborted) fail();
        else init.signal.addEventListener('abort', fail);
      }),
  );
}

function jsonResponse(body: unknown, status = 200) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

it('gives up on a request that never answers', async () => {
  fetchMock.mockImplementation(hangingFetch());
  jest.useFakeTimers();

  const pending = apiRequest('/profile/me').catch((e: unknown) => e);
  await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 100);
  const error = await pending;

  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(408);
  expect((error as ApiError).message).toMatch(/timed out/i);
});

it('leaves a request that answers in time alone', async () => {
  fetchMock.mockResolvedValue(jsonResponse({ id: 'abc' }));
  await expect(apiRequest('/profile/me')).resolves.toEqual({ id: 'abc' });
});

it('does not abort a slow-but-answering request early', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation(
    () =>
      new Promise(resolve =>
        setTimeout(() => resolve(jsonResponse({ ok: true })), REQUEST_TIMEOUT_MS - 1000),
      ),
  );

  const pending = apiRequest('/profile/me');
  await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
  await expect(pending).resolves.toEqual({ ok: true });
});

it('reports an abort by the caller as an abort, not as a timeout', async () => {
  fetchMock.mockImplementation(hangingFetch());
  const controller = new AbortController();

  const pending = apiRequest('/profile/me', { signal: controller.signal }).catch(
    (e: unknown) => e,
  );
  controller.abort();
  const error = await pending;

  expect(error).not.toBeInstanceOf(ApiError);
  expect((error as Error).name).toBe('AbortError');
});
