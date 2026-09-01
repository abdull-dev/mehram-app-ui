/**
 * Pre-parsing for the `country-state-city` dataset.
 *
 * `City.getAllCities()` builds ~150k objects out of the bundled 8MB city.json
 * and caches the result forever. Every city lookup goes through it, so the very
 * first one anywhere in the app pays the whole cost synchronously — measured at
 * ~100ms on a laptop and materially worse on a device — and every lookup after
 * that is instant. That is why the stall only ever shows up once, during a fresh
 * sign-up.
 *
 * The cost has to land somewhere, so it is deliberately spent while the user is
 * still reading the country list, where nothing is waiting on the JS thread. It
 * used to be kicked off from the country *selection* instead, which left only
 * the moment between picking a country and pressing Continue — usually a few
 * hundred milliseconds — so the parse was often still running when Continue was
 * pressed, and the button's loader could not paint until it finished.
 */
import { City } from 'country-state-city';

/** Whether the one-time whole-dataset conversion has been paid for. */
let datasetWarmed = false;

const warmed = new Set<string>();

/**
 * Pay the one-time whole-dataset parse. Country-independent: the library caches
 * the converted list globally, so this is the expensive half of every lookup and
 * warming it does not require knowing which country the user will pick.
 *
 * Call this as early in the flow as there is idle time for it — it blocks the JS
 * thread while it runs, so it wants a window where no animation or tap is
 * pending (see `InteractionManager`).
 */
export function warmCityDataset(): void {
  if (datasetWarmed) return;
  datasetWarmed = true;
  try {
    City.getAllCities();
  } catch {
    // Only a cache warm — a failure here just means the real call pays for it.
    datasetWarmed = false;
  }
}

/** Parse and cache the city list for a country, off the critical path. */
export function warmCities(countryCode?: string | null): void {
  if (!countryCode || warmed.has(countryCode)) return;
  warmed.add(countryCode);
  // Deferred a tick so the filter never lands in the same frame as the tap that
  // triggered it — the selection highlight paints first.
  setTimeout(() => {
    try {
      warmCityDataset();
      City.getCitiesOfCountry(countryCode);
    } catch {
      warmed.delete(countryCode);
    }
  }, 0);
}
