/**
 * API Configuration — kindred-marriage-backend
 *
 * Development builds talk to the backend running on the dev machine, so local
 * changes are exercised and the phone OTP appears in that server's terminal
 * (SMS_TRANSPORT=log). Release builds talk to the hosted API.
 *
 * The split is on `__DEV__` — true in a Metro/dev bundle, false in a release
 * bundle — so nothing needs editing by hand before shipping.
 */
import { NativeModules, Platform } from 'react-native';

/** Hosted API. Cleartext HTTP, whitelisted in network_security_config.xml. */
const HOSTED_ORIGIN = 'http://13.233.88.125';

/**
 * The port the dev backend listens on.
 *
 * 3001, not the 3000 in this repo's `.env`, and matching what the web app is
 * pointed at.
 *
 * Another checkout of the backend holds 3000 on this machine, and it runs
 * against a different Supabase project — so the default would send signups to
 * the wrong database and print the OTP in the wrong terminal. That checkout is
 * also older than both clients: it has no `pending-status`, no `pending-contact`
 * and no `resend-verification`, all of which this app calls, and it hardcodes
 * the phone OTP to `000000`.
 *
 * Change it back if 3000 is freed, and move the web's `API_ORIGIN` with it —
 * the two have to agree or a signup started in one is invisible to the other.
 */
const DEV_PORT = 3001;

/** The Android emulator's alias for the machine it runs on. */
const EMULATOR_HOST_ALIAS = '10.0.2.2';

/**
 * Where the dev machine is, as seen from an Android device.
 *
 * Taken from the address the JS bundle itself arrived from rather than written
 * down here. A hardcoded LAN address is only correct until DHCP renews the
 * lease: when this machine moved from .3 to .7 every request left the device
 * for an address with nothing on it, and since a SYN into an empty address is
 * never answered nor refused, each one hung for the client's full deadline and
 * then reported a timeout. Metro's own host cannot go stale that way — if the
 * bundle loaded, that address reaches this machine.
 *
 * Two shapes come back. A bundle served over Wi-Fi gives the machine's LAN
 * address, which is what a real handset needs. A bundle served through
 * `adb reverse` (how `react-native run-android` wires up an emulator) gives
 * loopback, which on the device means the device itself — so that case falls
 * back to the emulator's alias for its host. A physical handset therefore wants
 * to be on the same Wi-Fi as this machine; over USB alone it has no route to
 * the API.
 */
function androidDevHost(): string {
  // `getConstants()`, not a `scriptURL` property. Under the New Architecture
  // `NativeModules` is `global.nativeModuleProxy`, and only the legacy bridge's
  // `genModule` flattened a module's constants onto it (`Object.assign(module,
  // constants)`). Bridgeless never runs that, and `SourceCode`'s TurboModule
  // spec declares nothing but `getConstants`, so reading `.scriptURL` straight
  // off the module was always `undefined` — which sent every physical handset
  // into the emulator-alias fallback below and every request to an address it
  // has no route to. `getConstants()` is present on both paths.
  const scriptUrl: unknown =
    NativeModules?.SourceCode?.getConstants?.().scriptURL;
  const bundleHost =
    typeof scriptUrl === 'string'
      ? /^[a-z]+:\/\/([^/:]+)/i.exec(scriptUrl)?.[1]
      : undefined;

  if (!bundleHost || bundleHost === 'localhost' || bundleHost === '127.0.0.1') {
    return EMULATOR_HOST_ALIAS;
  }
  return bundleHost;
}

/** The iOS simulator shares the host's loopback, so it needs none of that. */
const DEV_ORIGIN =
  Platform.OS === 'android'
    ? `http://${androidDevHost()}:${DEV_PORT}`
    : `http://localhost:${DEV_PORT}`;

/**
 * The web build talks to its own origin and lets the host proxy `/v1` and
 * `/uploads` through to the API.
 *
 * It cannot do what the native builds do. A browser refuses to let an HTTPS
 * page fetch `http://`, and unlike Android there is no cleartext exemption to
 * grant — so pointing the web app straight at the hosted API would fail every
 * request with no way around it. A same-origin path also removes CORS from the
 * picture entirely. See vite.config.ts for the dev proxy.
 */
const ORIGIN =
  Platform.OS === 'web' ? '' : __DEV__ ? DEV_ORIGIN : HOSTED_ORIGIN;

export const API_BASE_URL = `${ORIGIN}/v1`;

/** Base URL of the media server (no /v1 suffix) — resolves relative photo paths. */
export const MEDIA_BASE_URL = ORIGIN;

/**
 * Resolves a photo URL returned by the backend.
 * Relative paths (e.g. "/uploads/photo.jpg") are prefixed with the server origin.
 * Absolute URLs (S3, Supabase, etc.) are returned as-is.
 */
export function resolvePhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Whether to offer "Continue with Google".
 *
 * On: the flow runs through Supabase's own OAuth (see lib/googleAuth), so the
 * app needs no Google SDK and holds no client IDs.
 *
 * It still depends on one-time Supabase dashboard setup — the Google provider
 * enabled with a Google Cloud client ID/secret, and `mehram://auth-callback`
 * allow-listed as a redirect URL. Until that is done the button surfaces the
 * provider error rather than failing silently.
 */
export const GOOGLE_SIGN_IN_ENABLED = true;
