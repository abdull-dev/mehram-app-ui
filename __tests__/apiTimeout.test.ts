/**
 * `fetch` has no timeout of its own, so a request that never answered never
 * settled — and a screen holding a control until its read lands held it
 * forever. The preferences step disables Continue until the stored preference
 * has been read, which is where that showed up.
 */
import {
  ApiError,
  PROVIDER_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
  apiRequest,
} from '../src/api/client';

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

/**
 * `/auth/register` waits on Supabase to mint the identity and hand the code to
 * SMTP, which measured 12-15s against a distant database — past the default
 * deadline. Aborting it reported a timeout for a signup the server completed,
 * leaving an account the user was then told already existed.
 */
it('honours a longer deadline for a provider-backed call', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation(
    (_url: string, init: { signal: AbortSignal }) =>
      new Promise((resolve, reject) => {
        setTimeout(() => resolve(jsonResponse({ status: 'pending_confirmation' })),
          REQUEST_TIMEOUT_MS + 5000);
        init.signal.addEventListener('abort', () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }),
  );

  const pending = apiRequest('/auth/register', {
    method: 'POST',
    timeoutMs: PROVIDER_TIMEOUT_MS,
  });
  await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 5000);
  await expect(pending).resolves.toEqual({ status: 'pending_confirmation' });
});

it('still gives up on a provider-backed call that never answers', async () => {
  fetchMock.mockImplementation(hangingFetch());
  jest.useFakeTimers();

  const pending = apiRequest('/auth/register', {
    method: 'POST',
    timeoutMs: PROVIDER_TIMEOUT_MS,
  }).catch((e: unknown) => e);
  await jest.advanceTimersByTimeAsync(PROVIDER_TIMEOUT_MS + 100);

  expect((await pending as ApiError).status).toBe(408);
});

it('does not send the deadline on to fetch as a request option', async () => {
  fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

  await apiRequest('/auth/register', { method: 'POST', timeoutMs: 1000 });

  expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('timeoutMs');
});
