/**
 * Per-country mobile number validation.
 *
 * The rules exist because one generic length check let a number that could
 * never receive an OTP through signup, so the cases that matter here are the
 * near-misses: right country, wrong length; right length, landline prefix.
 */
import {
  e164Problem,
  nationalNumberProblem,
  PHONE_RULES,
  COUNTRIES,
} from '../src/utils/phone';

describe('nationalNumberProblem', () => {
  it('accepts a valid number however the user typed it', () => {
    // Bare, with the trunk zero, with the country code, pasted as E.164.
    for (const entered of ['3001234567', '03001234567', '923001234567', '+923001234567']) {
      expect(nationalNumberProblem('+92', entered)).toBeNull();
    }
  });

  it('rejects a number that is short by one digit', () => {
    expect(nationalNumberProblem('+92', '300123456')).toMatch(/10 digits/);
  });

  it('rejects a number that is long by one digit', () => {
    expect(nationalNumberProblem('+92', '30012345678')).toMatch(/10 digits/);
  });

  it('rejects a correctly sized landline', () => {
    // 042 is Lahore: ten digits once the trunk zero goes, but not a mobile
    // range, so it passes the length check and has to fail on the prefix.
    expect(nationalNumberProblem('+92', '04235712345')).toMatch(/start with 3/);
  });

  it('names the country the user picked', () => {
    expect(nationalNumberProblem('+971', '12345')).toMatch(/United Arab Emirates/);
  });

  it('allows every length a multi-length country has', () => {
    expect(nationalNumberProblem('+60', '123456789')).toBeNull();
    expect(nationalNumberProblem('+60', '1234567890')).toBeNull();
    expect(nationalNumberProblem('+60', '12345678')).toMatch(/9 or 10 digits/);
  });

  it('asks for a number when the field is empty', () => {
    expect(nationalNumberProblem('+92', '')).toMatch(/enter your mobile number/i);
  });
});

describe('e164Problem', () => {
  it('accepts a valid full number', () => {
    expect(e164Problem('+923001234567')).toBeNull();
    expect(e164Problem('+971501234567')).toBeNull();
  });

  it('applies the country rule, not just the E.164 shape', () => {
    // Passes /^\+[1-9]\d{7,14}$/ — the old check — but is not a real PK mobile.
    expect(e164Problem('+92300123')).toMatch(/10 digits/);
  });

  it('rejects a number with no +', () => {
    expect(e164Problem('923001234567')).toMatch(/international format/);
  });

  it('does not judge an unlisted country by the fallback country rule', () => {
    // +81 (Japan) is not in COUNTRIES; it must not be checked against +92's rule.
    expect(e164Problem('+818012345678')).toBeNull();
  });
});

describe('PHONE_RULES', () => {
  it('covers every country the picker offers', () => {
    for (const c of COUNTRIES) {
      expect(PHONE_RULES[c.code]).toBeDefined();
    }
  });

  it('ships an example that its own rule accepts', () => {
    for (const [code, rule] of Object.entries(PHONE_RULES)) {
      expect([code, nationalNumberProblem(code, rule.example)]).toEqual([code, null]);
    }
  });
});
