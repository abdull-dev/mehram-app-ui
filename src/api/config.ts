/**
 * API Configuration — kindred-marriage-backend
 *
 * Android emulator routes "localhost" to itself, not the host Mac.
 * Use 10.0.2.2 for Android emulator, localhost for iOS simulator.
 *
 * Physical device on the same Wi-Fi: replace with your Mac's local IP,
 * e.g. 'http://192.168.1.42:3000'
 */
import { Platform } from 'react-native';

export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/v1'
    : 'http://localhost:3000/v1';

/** Base URL of the media server (no /v1 suffix) — used to resolve relative photo paths. */
export const MEDIA_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

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
