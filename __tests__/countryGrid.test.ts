/**
 * The offline coordinates → country lookup, which replaced two things that did
 * not work: nearest country *centroid* (London → Guernsey, Toronto → the United
 * States, New York → Bermuda, Delhi → Nepal), and a nearest-city scan of the
 * 8MB dataset, which was accurate but froze the JS thread for seconds with the
 * location spinner on screen.
 *
 * Regenerate the table with `node scripts/build-country-grid.mjs`.
 */
import { countryAt } from '../src/utils/countryGrid';

const CITIES: Array<[string, number, number, string]> = [
  ['Karachi', 24.86, 67.0, 'PK'],
  ['Lahore', 31.52, 74.35, 'PK'],
  ['Islamabad', 33.68, 73.04, 'PK'],
  ['Peshawar', 34.01, 71.58, 'PK'],
  ['Quetta', 30.18, 66.98, 'PK'],
  ['Dubai', 25.204, 55.27, 'AE'],
  ['Sharjah', 25.35, 55.42, 'AE'],
  ['Abu Dhabi', 24.45, 54.38, 'AE'],
  ['Riyadh', 24.71, 46.68, 'SA'],
  ['Jeddah', 21.49, 39.19, 'SA'],
  ['Doha', 25.28, 51.53, 'QA'],
  ['Manama', 26.22, 50.58, 'BH'],
  ['Kuwait City', 29.37, 47.98, 'KW'],
  ['Muscat', 23.58, 58.4, 'OM'],
  ['London', 51.5, -0.12, 'GB'],
  ['Birmingham', 52.48, -1.9, 'GB'],
  ['Manchester', 53.48, -2.24, 'GB'],
  ['Glasgow', 55.86, -4.25, 'GB'],
  ['Dublin', 53.35, -6.26, 'IE'],
  ['Toronto', 43.65, -79.38, 'CA'],
  ['Ottawa', 45.42, -75.69, 'CA'],
  ['New York', 40.71, -74.0, 'US'],
  ['Chicago', 41.88, -87.63, 'US'],
  ['Sydney', -33.86, 151.21, 'AU'],
  ['Melbourne', -37.81, 144.96, 'AU'],
  ['Delhi', 28.61, 77.2, 'IN'],
  ['Dhaka', 23.81, 90.41, 'BD'],
  ['Istanbul', 41.01, 28.97, 'TR'],
  ['Kuala Lumpur', 3.14, 101.68, 'MY'],
  ['Singapore', 1.35, 103.82, 'SG'],
  ['Cairo', 30.04, 31.24, 'EG'],
  ['Amsterdam', 52.37, 4.9, 'NL'],
  ['Brussels', 50.85, 4.35, 'BE'],
  ['Zurich', 47.37, 8.54, 'CH'],
];

describe('countryAt', () => {
  it.each(CITIES)('places %s (%s, %s) in %s', (_label, latitude, longitude, iso2) => {
    expect(countryAt({ latitude, longitude })).toBe(iso2);
  });

  it('reaches the coast from just offshore', () => {
    // A few km out into Lake Ontario, and into the Arabian Sea off Karachi.
    expect(countryAt({ latitude: 43.55, longitude: -79.45 })).toBe('CA');
    expect(countryAt({ latitude: 24.6, longitude: 66.95 })).toBe('PK');
  });

  it('gives up rather than guessing in mid-ocean', () => {
    expect(countryAt({ latitude: -35, longitude: -140 })).toBeNull();
  });

  it('handles the poles and the date line without going out of bounds', () => {
    expect(() => countryAt({ latitude: 89.9, longitude: 179.9 })).not.toThrow();
    expect(() => countryAt({ latitude: -89.9, longitude: -179.9 })).not.toThrow();
  });

  it('costs a fraction of the 8MB scan it replaced', () => {
    const started = Date.now();
    for (let i = 0; i < 200; i++) {
      countryAt({ latitude: 24.86 + i / 1000, longitude: 67 + i / 1000 });
    }
    // The scan it replaced was ~11ms per lookup on this machine, after a load
    // measured in hundreds of milliseconds.
    expect(Date.now() - started).toBeLessThan(200);
  });
});
