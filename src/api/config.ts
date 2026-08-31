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
import { Platform } from 'react-native';

/** Hosted API. Cleartext HTTP, whitelisted in network_security_config.xml. */
const HOSTED_ORIGIN = 'http://13.233.88.125';

/**
 * The dev machine, as seen from the device.
 *
 * The machine's LAN address rather than the 10.0.2.2 alias: 10.0.2.2 only
 * exists inside an Android emulator, so a real handset cannot reach it and
 * every request fails with "Network request failed". The emulator can reach the
 * LAN address too, so one value serves both.
 *
 * Update it if the router hands this machine a different address, and keep the
 * device on the same Wi-Fi. The iOS simulator shares the host's loopback.
 */
const DEV_HOST = '192.168.1.3:3000';

const DEV_ORIGIN =
  Platform.OS === 'android' ? `http://${DEV_HOST}` : 'http://localhost:3000';

const ORIGIN = __DEV__ ? DEV_ORIGIN : HOSTED_ORIGIN;

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
