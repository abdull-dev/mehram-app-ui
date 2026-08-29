import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { Country } from 'country-state-city';

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

/**
 * Request location permission (Android) then resolve with current GPS
 * coordinates, or null if permission denied or position unavailable.
 */
export function captureCurrentLocation(): Promise<Coords | null> {
  return new Promise(async resolve => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access',
            message: 'Wisal needs your location to suggest nearby matches.',
            buttonPositive: 'Allow',
            buttonNegative: 'Skip',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          resolve(null);
          return;
        }
      }

      Geolocation.getCurrentPosition(
        pos =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Offline reverse-geocode: finds the nearest country to the given coordinates
 * by comparing against each country's geographic centroid from the
 * `country-state-city` dataset. No network required. ~250 iterations, < 1 ms.
 *
 * Returns the ISO-2 country code (e.g. "PK", "AE") or null if data is absent.
 */
export function reverseGeocodeCountry(coords: Coords): string | null {
  const countries = Country.getAllCountries();
  let nearest: { isoCode: string; dist: number } | null = null;

  for (const country of countries) {
    if (!country.latitude || !country.longitude) continue;
    const lat = parseFloat(country.latitude);
    const lng = parseFloat(country.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;
    const dist = distanceKm(coords, { latitude: lat, longitude: lng });
    if (!nearest || dist < nearest.dist) {
      nearest = { isoCode: country.isoCode, dist };
    }
  }

  return nearest?.isoCode ?? null;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
