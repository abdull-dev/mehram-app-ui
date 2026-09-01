/**
 * City lists for the `country-state-city` dataset, loaded off the UI thread.
 *
 * The library's accessors all funnel through `City.getAllCities()`, which turns
 * the whole bundled 8MB `city.json` into ~148,000 objects and caches them.
 * Whichever screen asks first pays for all of it synchronously, and on a phone
 * that is seconds of frozen JS — no taps register and no animation advances.
 * The country step used to schedule that work deliberately, which is why its
 * list would not respond for a while on a fresh sign-up.
 *
 * Two things fix that here:
 *
 *   - The 8MB module is reached through `import()`, so requiring it is not on
 *     the path of any tap, and nothing loads it until a screen actually needs
 *     city names. The country step no longer does.
 *   - Nothing ever needs all 148,000 objects. The raw JSON is an array of
 *     positional tuples, so this filters tuples — one string compare per row —
 *     and builds objects only for the few hundred that survive. Measured:
 *     66ms → 3ms for Pakistan's cities, byte-identical output.
 *
 * The load itself still blocks while it runs, so callers await it and show a
 * skeleton (see `useCitiesOfCountry`) rather than pretending it is instant.
 */
import type { ICity } from 'country-state-city';
import { Coords, distanceKm } from './geo';

/** `[name, countryCode, stateCode, latitude, longitude]` */
type CityRow = [string, string, string, string, string];

const KEYS: Array<keyof ICity> = [
  'name',
  'countryCode',
  'stateCode',
  'latitude',
  'longitude',
];

let rows: CityRow[] | null = null;
let loading: Promise<CityRow[]> | null = null;

/**
 * The dataset as raw tuples.
 *
 * Read straight from the package's asset because the library exposes no way to
 * get at it unconverted — and going through the library would pull in its
 * eager `city.js`, which converts everything on import.
 */
function loadRows(): Promise<CityRow[]> {
  if (rows) return Promise.resolve(rows);
  if (loading) return loading;

  loading = import('country-state-city/lib/assets/city.json')
    .then(module => {
      const asset = (module as { default?: unknown }).default ?? module;
      rows = Array.isArray(asset) ? (asset as CityRow[]) : [];
      return rows;
    })
    .catch(() => {
      // Nothing to fall back to, and no reason to bring the screen down: the
      // city list is optional, and its caller renders an empty list.
      loading = null;
      return [];
    });

  return loading;
}

function toCity(row: CityRow): ICity {
  const city = {} as Record<string, string>;
  for (let i = 0; i < KEYS.length; i++) {
    city[KEYS[i] as string] = row[i];
  }
  return city as unknown as ICity;
}

// ─── per-country lists ────────────────────────────────────────────────────────

const byCountry = new Map<string, ICity[]>();

function build(countryCode: string, all: CityRow[]): ICity[] {
  const cached = byCountry.get(countryCode);
  if (cached) return cached;

  const cities = all
    .filter(row => row[1] === countryCode)
    .map(toCity)
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  byCountry.set(countryCode, cities);
  return cities;
}

/**
 * Cities of one country, name-sorted. Cached per country, so the second screen
 * to ask for the same country gets it for free.
 */
export async function loadCitiesOfCountry(
  countryCode?: string | null,
): Promise<ICity[]> {
  if (!countryCode) return [];
  const cached = byCountry.get(countryCode);
  if (cached) return cached;
  return build(countryCode, await loadRows());
}

/**
 * The same list, but only if it is already in memory — for a render that cannot
 * wait. `null` means "not loaded yet", which is a different thing from a
 * country with no cities, and is what a caller shows a skeleton for.
 */
export function citiesOfCountry(countryCode?: string | null): ICity[] | null {
  if (!countryCode) return [];
  return byCountry.get(countryCode) ?? null;
}

// ─── nearest place ────────────────────────────────────────────────────────────

export interface NearestCity {
  name: string;
  countryCode: string;
  distanceKm: number;
}

/**
 * Nearest city within one country — for a screen that has already committed to
 * a country and wants the city inside it, even if a nearer place lies across
 * the border.
 *
 * For the country itself, use `countryAt` from `./countryGrid`: it answers from
 * a 93KB table instead of loading this dataset.
 */
export async function findNearestCityInCountry(
  coords: Coords,
  countryCode?: string | null,
): Promise<NearestCity | null> {
  let best: NearestCity | null = null;

  for (const city of await loadCitiesOfCountry(countryCode)) {
    const lat = parseFloat(city.latitude ?? '');
    const lng = parseFloat(city.longitude ?? '');
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const dist = distanceKm(coords, { latitude: lat, longitude: lng });
    if (!best || dist < best.distanceKm) {
      best = { name: city.name, countryCode: city.countryCode, distanceKm: dist };
    }
  }

  return best;
}
