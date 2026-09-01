/**
 * Two things this has to keep true. The per-country lists must match what the
 * library itself would return — they are built by filtering the raw tuples,
 * which is 20× faster but only useful if it is also correct. And the load must
 * be asynchronous: reading the 8MB dataset during a render is what froze the
 * onboarding list.
 */
import { City } from 'country-state-city';
import {
  citiesOfCountry,
  findNearestCityInCountry,
  loadCitiesOfCountry,
} from '../src/utils/cityData';

describe('loadCitiesOfCountry', () => {
  it.each(['PK', 'AE', 'GB', 'SA'])('matches the library for %s', async code => {
    const expected = (City.getCitiesOfCountry(code) ?? []).map(c => c.name);
    const actual = (await loadCitiesOfCountry(code)).map(c => c.name);
    expect(actual).toEqual(expected);
  });

  it('carries the coordinates through', async () => {
    const cities = await loadCitiesOfCountry('PK');
    const karachi = cities.find(c => c.name === 'Karachi');
    expect(karachi).toMatchObject({ countryCode: 'PK' });
    expect(parseFloat(String(karachi?.latitude))).toBeCloseTo(24.86, 1);
    expect(parseFloat(String(karachi?.longitude))).toBeCloseTo(67.01, 1);
  });

  it('returns an empty list rather than throwing on nonsense input', async () => {
    await expect(loadCitiesOfCountry(null)).resolves.toEqual([]);
    await expect(loadCitiesOfCountry('ZZ')).resolves.toEqual([]);
  });
});

describe('citiesOfCountry', () => {
  it('reports a country it has not loaded as not loaded, not as empty', () => {
    // Distinguishing the two is what lets a screen show a skeleton instead of
    // "no cities found".
    expect(citiesOfCountry('BD')).toBeNull();
  });

  it('answers immediately once loaded', async () => {
    await loadCitiesOfCountry('AE');
    expect(citiesOfCountry('AE')?.length).toBeGreaterThan(0);
  });

  it('has nothing to load for no country', () => {
    expect(citiesOfCountry(null)).toEqual([]);
  });
});

describe('findNearestCityInCountry', () => {
  it('stays inside the country it was given', async () => {
    // Dubai coordinates, asked for Pakistan: the answer must be Pakistani.
    const nearest = await findNearestCityInCountry(
      { latitude: 25.204, longitude: 55.27 },
      'PK',
    );
    expect(nearest?.countryCode).toBe('PK');
  });

  it('finds the city the fix is actually in', async () => {
    const nearest = await findNearestCityInCountry(
      { latitude: 31.52, longitude: 74.35 },
      'PK',
    );
    expect(nearest?.name).toBe('Lahore');
  });

  it('has nothing to return for an unknown country', async () => {
    await expect(
      findNearestCityInCountry({ latitude: 0, longitude: 0 }, 'ZZ'),
    ).resolves.toBeNull();
  });
});
