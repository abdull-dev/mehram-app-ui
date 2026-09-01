import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { countryAt } from './countryGrid';
import { Coords } from './geo';

// Geographic maths lives in `./geo` so the city dataset can use it too, and is
// re-exported here because this is where callers already look for it.
export type { Coords } from './geo';
export { distanceKm, formatDistanceKm } from './geo';

// ─── failure reasons ──────────────────────────────────────────────────────────

/**
 * Why a location attempt produced no coordinates. Worth distinguishing, because
 * the three want different things from the user: `permission` needs Settings,
 * `unavailable` needs the device's location toggle, and `timeout` just needs
 * another try.
 */
export type LocationFailure = 'permission' | 'unavailable' | 'timeout';

export type LocationResult =
  | { ok: true; coords: Coords }
  | { ok: false; reason: LocationFailure };

/** Position error codes, per the W3C geolocation spec the module follows. */
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

// ─── native configuration ─────────────────────────────────────────────────────

let configured = false;

/**
 * Has to run before the first request or iOS never shows its prompt: the module
 * only requests authorization when it knows which level to ask for.
 */
function configure(): void {
  if (configured) return;
  configured = true;
  try {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: false,
      authorizationLevel: 'whenInUse',
      locationProvider: 'auto',
      enableBackgroundLocationUpdates: false,
    });
  } catch {
    // An older native build without setConfiguration — the defaults still work.
    configured = false;
  }
}

// ─── permission ───────────────────────────────────────────────────────────────

/**
 * Android runtime permission. Asks for fine and coarse together and accepts
 * either: a country — and even a city — is well within coarse accuracy, and on
 * a device where the user has granted only approximate location, insisting on
 * fine would read as a denial.
 */
async function ensureAndroidPermission(): Promise<boolean> {
  const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

  // Already granted is the common case on a retry, and re-requesting there
  // returns without a dialog anyway — but checking first keeps the retry silent.
  if (
    (await PermissionsAndroid.check(fine)) ||
    (await PermissionsAndroid.check(coarse))
  ) {
    return true;
  }

  const result = await PermissionsAndroid.requestMultiple([fine, coarse]);
  return (
    result[fine] === PermissionsAndroid.RESULTS.GRANTED ||
    result[coarse] === PermissionsAndroid.RESULTS.GRANTED
  );
}

// ─── position ─────────────────────────────────────────────────────────────────

type Attempt = {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
};

/**
 * Tried in order, stopping at the first fix.
 *
 * One high-accuracy call is not enough in practice. On Android the fused
 * provider reports `onLocationAvailability(false)` the moment it subscribes
 * indoors — which the module surfaces as POSITION_UNAVAILABLE straight away,
 * before any fix has had a chance to arrive — so a single attempt fails
 * instantly even with permission granted and location switched on. The second
 * attempt drops to the low-power provider (wifi/cell, which works indoors) and
 * the third accepts any cached fix at all, however old.
 */
const ATTEMPTS: Attempt[] = [
  { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 },
  { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
  { enableHighAccuracy: false, timeout: 3000, maximumAge: Infinity },
];

/**
 * Everything above plus the watch, end to end. The attempts mostly fail fast —
 * the fused provider answers "unavailable" the moment it is asked — but each can
 * run its full timeout, and a spinner that never resolves is worse than a
 * message saying to try again. Twelve seconds is long enough for a cold GPS fix
 * over wifi and short enough to stay a wait rather than a hang.
 */
const TOTAL_BUDGET_MS = 12000;

/** Shortest watch worth starting with whatever budget is left. */
const MIN_WATCH_MS = 4000;

function getPosition(options: Attempt): Promise<LocationResult> {
  return new Promise(resolve => {
    let settled = false;
    const done = (r: LocationResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    // The native timeout is not always honoured — a provider that never calls
    // back leaves the promise open — so the JS side keeps its own clock.
    const timer = setTimeout(
      () => done({ ok: false, reason: 'timeout' }),
      options.timeout + 2000,
    );

    Geolocation.getCurrentPosition(
      pos => {
        clearTimeout(timer);
        done({
          ok: true,
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
        });
      },
      err => {
        clearTimeout(timer);
        done({ ok: false, reason: reasonForCode(err?.code) });
      },
      options,
    );
  });
}

/**
 * Last resort: subscribe to updates and take the first one that arrives,
 * ignoring errors along the way. This is what gets a fix indoors, where the
 * one-shot calls report the provider as unavailable while it is still warming
 * up but do deliver a position a few seconds later.
 */
function watchForPosition(timeoutMs: number): Promise<LocationResult> {
  return new Promise(resolve => {
    let settled = false;
    let watchId: number | null = null;
    let cleared = false;

    /**
     * Safe to call before the watch id exists: the subscription can deliver its
     * first position synchronously, and clearing then would be a no-op that
     * leaves the watch running. The call site clears it again once it has an id.
     */
    const clearIfPossible = () => {
      if (cleared || watchId === null) return;
      cleared = true;
      try {
        Geolocation.clearWatch(watchId);
      } catch {
        // Already gone.
      }
    };

    const finish = (r: LocationResult) => {
      if (settled) return;
      settled = true;
      clearIfPossible();
      resolve(r);
    };

    const timer = setTimeout(() => finish({ ok: false, reason: 'timeout' }), timeoutMs);

    try {
      watchId = Geolocation.watchPosition(
        pos => {
          clearTimeout(timer);
          finish({
            ok: true,
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            },
          });
        },
        err => {
          // Only a denial is final here. Availability blips are exactly what
          // this fallback exists to sit through.
          if (err?.code === PERMISSION_DENIED) {
            clearTimeout(timer);
            finish({ ok: false, reason: 'permission' });
          }
        },
        { enableHighAccuracy: true, distanceFilter: 0 },
      );
      clearIfPossible();
    } catch {
      clearTimeout(timer);
      finish({ ok: false, reason: 'unavailable' });
    }
  });
}

function reasonForCode(code: number | undefined): LocationFailure {
  if (code === PERMISSION_DENIED) return 'permission';
  if (code === TIMEOUT) return 'timeout';
  if (code === POSITION_UNAVAILABLE) return 'unavailable';
  return 'unavailable';
}

/**
 * Request permission then resolve with the device's current coordinates,
 * or the reason none could be obtained.
 */
export async function requestLocation(): Promise<LocationResult> {
  configure();

  try {
    if (Platform.OS === 'android' && !(await ensureAndroidPermission())) {
      return { ok: false, reason: 'permission' };
    }
  } catch {
    return { ok: false, reason: 'permission' };
  }

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let last: LocationResult = { ok: false, reason: 'unavailable' };

  for (const attempt of ATTEMPTS) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return last;
    const result = await getPosition({
      ...attempt,
      timeout: Math.min(attempt.timeout, remaining),
    });
    if (result.ok) return result;
    // A refusal will not become a yes on the next attempt; anything else might.
    if (result.reason === 'permission') return result;
    last = result;
  }

  const remaining = deadline - Date.now();
  if (remaining < MIN_WATCH_MS) return last;

  const watched = await watchForPosition(remaining);
  return watched.ok ? watched : last;
}

/**
 * Coordinates, or null if they could not be obtained. For call sites that only
 * branch on success — `requestLocation` carries the reason.
 */
export async function captureCurrentLocation(): Promise<Coords | null> {
  const result = await requestLocation();
  return result.ok ? result.coords : null;
}

/**
 * Offline reverse-geocode. No network required, and no dataset load: the answer
 * comes from the pre-built quarter-degree grid in `./countryGrid`, which is
 * 93KB against the city list's 8MB. Scanning the city list was accurate but
 * took seconds on a phone — with the spinner on screen the whole time, which is
 * what made "Use my location" look like it had hung.
 *
 * Returns the ISO-2 country code (e.g. "PK", "AE") or null if the coordinates
 * are nowhere near a populated place.
 */
export function reverseGeocodeCountry(coords: Coords): string | null {
  return countryAt(coords);
}
