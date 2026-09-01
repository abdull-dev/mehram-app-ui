/**
 * Family type has two halves that have to agree: the chips F11 offers, and the
 * `FamilyType` enum the server stores. They did not.
 *
 * F11 offered Nuclear / Extended / Joint, and the enum has only NUCLEAR and
 * JOINT — so "Extended" was saved as JOINT, and reopening the form moved the
 * user's answer to "Joint" without telling them. These tests pin the round trip
 * so a third chip cannot be added again without a value to store it in.
 */
import { toFamilyType, type FamilyTypeEnum } from '../src/api/profile';
import { FAMILY_TYPE_LABELS } from '../src/utils/enumLabels';
import { FAMILY_TYPE_OPTIONS } from '../src/screens/onboarding/FamilyAndHomeScreen';

/** The chips F11 offers, read from the screen itself so it cannot drift. */
const OFFERED = FAMILY_TYPE_OPTIONS;

const ENUM_VALUES: FamilyTypeEnum[] = ['JOINT', 'NUCLEAR'];

describe('family type round trip', () => {
  it('saves each offered option as a distinct enum value', () => {
    const saved = OFFERED.map(toFamilyType);
    expect(saved).toEqual(['JOINT', 'NUCLEAR']);
    expect(OFFERED).toEqual(['Joint family', 'Nuclear family']);
    // Distinct is the point: two chips that save the same value are two ways of
    // saying one thing, and one of them loses.
    expect(new Set(saved).size).toBe(OFFERED.length);
  });

  it('shows each saved value back as the option that was chosen', () => {
    for (const option of OFFERED) {
      expect(FAMILY_TYPE_LABELS[toFamilyType(option)]).toBe(option);
    }
  });

  it('has a label for every enum value', () => {
    for (const value of ENUM_VALUES) {
      expect(FAMILY_TYPE_LABELS[value]).toBeTruthy();
    }
  });

  it('offers no label the enum cannot store', () => {
    expect(Object.keys(FAMILY_TYPE_LABELS).sort()).toEqual([...ENUM_VALUES].sort());
  });
});

describe('toFamilyType', () => {
  it('still understands the labels the screen used to send', () => {
    expect(toFamilyType('Joint')).toBe('JOINT');
    expect(toFamilyType('Nuclear')).toBe('NUCLEAR');
    // Pakistani families call this joint, and it was stored as JOINT already.
    expect(toFamilyType('Extended')).toBe('JOINT');
  });

  it('passes an enum value straight through', () => {
    expect(toFamilyType('JOINT')).toBe('JOINT');
    expect(toFamilyType('NUCLEAR')).toBe('NUCLEAR');
  });

  it('falls back to the option the form shows first', () => {
    expect(toFamilyType('')).toBe('JOINT');
    expect(toFamilyType('Something else')).toBe('JOINT');
  });
});
