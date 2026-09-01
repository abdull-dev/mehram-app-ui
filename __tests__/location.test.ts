/**
 * The "use my location" row used to report "Location unavailable. Enable in
 * Settings." for every failure, including the one that happens on a device with
 * permission already granted: Android's fused provider answers
 * POSITION_UNAVAILABLE the instant it is subscribed to indoors, before any fix
 * has had a chance to arrive. These tests pin the staged retry that gets past
 * it, and the reason each failure reports.
 */
import Geolocation from '@react-native-community/geolocation';

jest.mock('@react-native-community/geolocation', () => ({
  setRNConfiguration: jest.fn(),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

const { requestLocation, reverseGeocodeCountry } = require('../src/utils/location');

const geo = Geolocation as unknown as {
  getCurrentPosition: jest.Mock;
  watchPosition: jest.Mock;
  clearWatch: jest.Mock;
};

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

const KARACHI = { coords: { latitude: 24.86, longitude: 67.0 }, timestamp: 0 };

/** Queues one outcome per `getCurrentPosition` call, in order. */
function queuePositions(...outcomes: Array<'ok' | number>) {
  let call = 0;
  geo.getCurrentPosition.mockImplementation((success, error) => {
    const outcome = outcomes[call++];
    if (outcome === 'ok') success(KARACHI);
    else error?.({ code: outcome, message: 'mock' });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  geo.watchPosition.mockImplementation(() => 1);
});

describe('requestLocation', () => {
  it('returns the first fix it gets', async () => {
    queuePositions('ok');
    await expect(requestLocation()).resolves.toEqual({
      ok: true,
      coords: { latitude: 24.86, longitude: 67.0 },
    });
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(geo.watchPosition).not.toHaveBeenCalled();
  });

  it('retries at lower accuracy when the provider reports itself unavailable', async () => {
    queuePositions(POSITION_UNAVAILABLE, 'ok');
    const result = await requestLocation();
    expect(result.ok).toBe(true);
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
    // The retry must not ask for high accuracy again — that is the request the
    // fused provider cannot satisfy indoors.
    expect(geo.getCurrentPosition.mock.calls[0][2].enableHighAccuracy).toBe(true);
    expect(geo.getCurrentPosition.mock.calls[1][2].enableHighAccuracy).toBe(false);
  });

  it('accepts a stale cached fix before giving up', async () => {
    queuePositions(POSITION_UNAVAILABLE, TIMEOUT, 'ok');
    const result = await requestLocation();
    expect(result.ok).toBe(true);
    expect(geo.getCurrentPosition.mock.calls[2][2].maximumAge).toBe(Infinity);
  });

  it('falls back to watching for an update when every one-shot call fails', async () => {
    queuePositions(POSITION_UNAVAILABLE, POSITION_UNAVAILABLE, POSITION_UNAVAILABLE);
    geo.watchPosition.mockImplementation(success => {
      success(KARACHI);
      return 7;
    });

    const result = await requestLocation();
    expect(result).toEqual({ ok: true, coords: { latitude: 24.86, longitude: 67.0 } });
    expect(geo.clearWatch).toHaveBeenCalledWith(7);
  });

  it('sits through an availability error during the watch', async () => {
    queuePositions(POSITION_UNAVAILABLE, POSITION_UNAVAILABLE, POSITION_UNAVAILABLE);
    geo.watchPosition.mockImplementation((success, error) => {
      error?.({ code: POSITION_UNAVAILABLE, message: 'not available yet' });
      success(KARACHI);
      return 8;
    });

    await expect(requestLocation()).resolves.toMatchObject({ ok: true });
  });

  it('stops immediately when permission is refused, and says so', async () => {
    queuePositions(PERMISSION_DENIED, 'ok');
    await expect(requestLocation()).resolves.toEqual({
      ok: false,
      reason: 'permission',
    });
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(geo.watchPosition).not.toHaveBeenCalled();
  });

  it('reports an unavailable provider as unavailable, not as a permission problem', async () => {
    queuePositions(POSITION_UNAVAILABLE, POSITION_UNAVAILABLE, POSITION_UNAVAILABLE);
    geo.watchPosition.mockImplementation((_success, error) => {
      error?.({ code: POSITION_UNAVAILABLE, message: 'mock' });
      return 9;
    });
    // Nothing here ever delivers a position, so the watch's own timeout is what
    // ends the flow — run the clock rather than waiting on it.
    jest.useFakeTimers();
    const pending = requestLocation();
    await jest.advanceTimersByTimeAsync(60000);
    const result = await pending;
    jest.useRealTimers();
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('reverseGeocodeCountry', () => {
  it('names the country a fix is in', () => {
    expect(reverseGeocodeCountry({ latitude: 24.86, longitude: 67.0 })).toBe('PK');
    expect(reverseGeocodeCountry({ latitude: 51.5, longitude: -0.12 })).toBe('GB');
  });
});
