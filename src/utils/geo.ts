/**
 * Geographic primitives shared by the location and city-dataset helpers.
 *
 * Separate from `location.ts` only to keep the imports acyclic: reverse
 * geocoding needs the city dataset, and the city dataset needs to measure
 * distances.
 */

export interface Coords {
  latitude: number;
  longitude: number;
}

/** Haversine great-circle distance in km between two points. */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

/** Human-readable distance label, e.g. "< 1 km", "~8 km", "~140 km". */
export function formatDistanceKm(km: number): string {
  if (km < 1) return '< 1 km away';
  if (km < 10) return `~${Math.round(km)} km away`;
  return `~${Math.round(km / 10) * 10} km away`;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
