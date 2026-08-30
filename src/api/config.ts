/**
 * API Configuration — kindred-marriage-backend
 *
 * Hosted API (http). Debug Android allows cleartext; a Play release
 * should use HTTPS or keep usesCleartextTraffic enabled.
 */
export const API_BASE_URL = 'http://13.233.88.125/v1';

/** Base URL of the media server (no /v1 suffix) — used to resolve relative photo paths. */
export const MEDIA_BASE_URL = 'http://13.233.88.125';

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
