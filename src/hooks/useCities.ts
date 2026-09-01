/**
 * City names for a country, loaded without blocking the render.
 *
 * The dataset behind this is 8MB and loads in one synchronous chunk once (see
 * `src/utils/cityData.ts`). A screen that reads it during render freezes on
 * first mount; this hook hands back `loading` instead, so the list can show a
 * skeleton for the moment it takes and fill in when the names arrive.
 */
import { useEffect, useState } from 'react';
import { citiesOfCountry, loadCitiesOfCountry } from '../utils/cityData';

export interface CityNames {
  /** Unique, locale-sorted city names. Empty while `loading`. */
  names: string[];
  loading: boolean;
}

function namesOf(cities: { name: string }[]): string[] {
  return [...new Set(cities.map(c => c.name))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * Long enough for the skeleton to reach the screen first.
 *
 * The dataset evaluates in one synchronous chunk once the import resolves, and
 * a promise that settles on the next microtask can get there before the frame
 * the skeleton was rendered in has been drawn — leaving the user looking at the
 * previous screen for the length of the load. A timeout puts the load in a
 * later frame.
 */
const LOAD_DELAY_MS = 50;

/**
 * @param enabled Whether the names are wanted yet. Pass a picker's `visible`
 *   flag: a modal that stays mounted while closed would otherwise pay for the
 *   dataset the moment its screen opens, and the freeze that causes is what made
 *   the preferences step swallow the first tap on Continue.
 */
export function useCityNames(
  countryCode?: string | null,
  enabled: boolean = true,
): CityNames {
  // Already in memory on a revisit — no skeleton for a list we have.
  const cached = citiesOfCountry(countryCode);
  const [names, setNames] = useState<string[] | null>(
    cached ? namesOf(cached) : null,
  );

  useEffect(() => {
    if (!enabled) return;

    const ready = citiesOfCountry(countryCode);
    if (ready) {
      setNames(namesOf(ready));
      return;
    }

    let live = true;
    setNames(null);
    const timer = setTimeout(() => {
      loadCitiesOfCountry(countryCode).then(cities => {
        if (live) setNames(namesOf(cities));
      });
    }, LOAD_DELAY_MS);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [countryCode, enabled]);

  return { names: names ?? [], loading: enabled && names === null };
}
