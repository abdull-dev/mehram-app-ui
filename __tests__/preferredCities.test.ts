/**
 * The city picker used to go nowhere.
 *
 * `PartnerPreference` had no city column, so F13 let a user tick as many cities
 * as they liked and then sent none of them — the picker reopened on the default
 * and the feed was never narrowed by any of it. `preferredCities` is a real
 * column now, which makes two things load-bearing that were decorative before:
 * what a ticked city is saved as, and what the form defaults to for somebody
 * who never opens the picker at all.
 */
import {
  PREFERENCE_DEFAULTS,
  cityNameForApi,
  preferencesFromApi,
  preferencesToApi,
  withPreferenceDefaults,
} from '../src/components/preferences/PreferenceFields';

describe('cityNameForApi', () => {
  // The overseas rows carry their country so one list can hold two Birminghams.
  // `Profile.city` does not, so the parenthesis has to come off.
  it('drops the country the overseas rows are labelled with', () => {
    expect(cityNameForApi('London (United Kingdom)')).toBe('London');
    expect(cityNameForApi('Abu Dhabi (UAE)')).toBe('Abu Dhabi');
  });

  it('leaves a plain city name alone', () => {
    expect(cityNameForApi('Lahore')).toBe('Lahore');
    expect(cityNameForApi('Dera Ghazi Khan')).toBe('Dera Ghazi Khan');
  });
});

describe('preferredCities round trip', () => {
  it('sends the cities that were ticked', () => {
    const values = withPreferenceDefaults({ cities: ['Lahore', 'Karachi'] });
    expect(preferencesToApi(values).preferredCities).toEqual([
      'Lahore',
      'Karachi',
    ]);
  });

  it('sends overseas picks as the name the server stores', () => {
    const values = withPreferenceDefaults({
      cities: ['London (United Kingdom)'],
      includeOverseas: true,
    });
    expect(preferencesToApi(values).preferredCities).toEqual(['London']);
  });

  /*
   * Sent, not omitted. The endpoint patches, so an absent key keeps whatever
   * was stored — and clearing the picker would then leave yesterday's cities
   * filtering a feed that shows none of them.
   */
  it('says "any city" out loud rather than staying silent', () => {
    const values = withPreferenceDefaults({ cities: [] });
    expect(preferencesToApi(values).preferredCities).toEqual([]);
  });

  it('reads the stored cities back into the picker', () => {
    expect(preferencesFromApi({ preferredCities: ['Multan'] }).cities).toEqual([
      'Multan',
    ]);
  });

  // An empty stored list has to beat the defaults, or clearing every city would
  // not survive reopening the screen.
  it('reads an empty stored list back as an empty picker', () => {
    expect(preferencesFromApi({ preferredCities: [] }).cities).toEqual([]);
  });
});

/*
 * The default was `['Lahore']` while it went nowhere. As a saved hard filter,
 * that same default would restrict somebody in Karachi who never opened the
 * picker to a city they have no connection to.
 */
describe('the default city list', () => {
  it('is empty, so nobody is filtered to a city they did not choose', () => {
    expect(PREFERENCE_DEFAULTS.cities).toEqual([]);
    expect(preferencesToApi(PREFERENCE_DEFAULTS).preferredCities).toEqual([]);
  });
});
