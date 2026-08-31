/**
 * Pre-parsing for the `country-state-city` dataset.
 *
 * The library parses its whole bundled dataset on the first city lookup and
 * caches it after that — measured at ~100ms on a laptop and materially worse on
 * a device. That parse used to happen synchronously inside CityScreen's first
 * render, blocking the JS thread the moment the user pressed Continue, so the
 * press looked ignored until the screen finally appeared. Every later visit was
 * instant, which is why it only ever showed up "the first time".
 *
 * Warming it while the user is still choosing a country moves that cost into a
 * window where nothing is waiting on it.
 */
import { City } from 'country-state-city';

const warmed = new Set<string>();

/** Parse and cache the city list for a country, off the critical path. */
export function warmCities(countryCode?: string | null): void {
  if (!countryCode || warmed.has(countryCode)) return;
  warmed.add(countryCode);
  // Deferred a tick so the parse never lands in the same frame as the tap that
  // triggered it — the selection highlight paints first.
  setTimeout(() => {
    try {
      City.getCitiesOfCountry(countryCode);
    } catch {
      // Only a cache warm — a failure here just means the real call pays for it.
      warmed.delete(countryCode);
    }
  }, 0);
}
