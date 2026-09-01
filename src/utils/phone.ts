/**
 * Phone number entry helpers — shared by the signup form and anything that has
 * to put an existing E.164 number back into that form.
 *
 * These lived inside PhoneScreen until AccountVerification grew a "Change
 * number" route back into it: re-opening the form pre-filled needs the inverse
 * of what signup does, and both halves have to agree about dial codes or the
 * number round-trips wrong.
 */

export interface Country {
  flag: string;
  name: string;
  code: string;
}

/**
 * Canada carries the " CA" suffix because `code` doubles as the React key and
 * as the chip label, and a bare "+1" would collide with the United States.
 * Everything that treats the code as a number strips non-digits first.
 */
export const COUNTRIES: Country[] = [
  { flag: '🇵🇰', name: 'Pakistan', code: '+92' },
  { flag: '🇦🇪', name: 'United Arab Emirates', code: '+971' },
  { flag: '🇸🇦', name: 'Saudi Arabia', code: '+966' },
  { flag: '🇬🇧', name: 'United Kingdom', code: '+44' },
  { flag: '🇺🇸', name: 'United States', code: '+1' },
  { flag: '🇨🇦', name: 'Canada', code: '+1 CA' },
  { flag: '🇦🇺', name: 'Australia', code: '+61' },
  { flag: '🇶🇦', name: 'Qatar', code: '+974' },
  { flag: '🇴🇲', name: 'Oman', code: '+968' },
  { flag: '🇰🇼', name: 'Kuwait', code: '+965' },
  { flag: '🇧🇭', name: 'Bahrain', code: '+973' },
  { flag: '🇲🇾', name: 'Malaysia', code: '+60' },
  { flag: '🇩🇪', name: 'Germany', code: '+49' },
  { flag: '🇳🇴', name: 'Norway', code: '+47' },
  { flag: '🇩🇰', name: 'Denmark', code: '+45' },
  { flag: '🇮🇹', name: 'Italy', code: '+39' },
  { flag: '🇪🇸', name: 'Spain', code: '+34' },
  { flag: '🇹🇷', name: 'Turkey', code: '+90' },
  { flag: '🇿🇦', name: 'South Africa', code: '+27' },
  { flag: '🇳🇿', name: 'New Zealand', code: '+64' },
  { flag: '🇮🇪', name: 'Ireland', code: '+353' },
  { flag: '🇫🇷', name: 'France', code: '+33' },
];

/** Digits only — turns a chip label like "+1 CA" into "1". */
export function dialDigits(code: string): string {
  return code.replace(/\D/g, '');
}

/**
 * The national part of what was typed — everything the dial-code chip beside
 * the field does not already show.
 *
 * People enter their number however they know it: already carrying the country
 * code ("923114440959"), with the local trunk zero ("03114440959"), with an
 * international prefix ("0092…"), or bare. The field used to keep all of it
 * verbatim, so the chip and the text together read "+92 92311…", and submitting
 * concatenated them into +92923114440959 — invalid, yet accepted at signup, so
 * the account existed against a number no OTP could reach.
 *
 * A bare country code is only removed once enough digits follow to still leave
 * a plausible subscriber number. That way a national number which happens to
 * begin with the same digits survives, and nothing is taken away mid-keystroke
 * before we can tell the two apart. An explicit "+" or "00" is unambiguous and
 * is stripped straight away.
 */
export function nationalPart(dialCode: string, entered: string): string {
  const cc = dialDigits(dialCode);
  const explicitPrefix = /^\s*(\+|00)/.test(entered);
  let digits = entered.replace(/\D/g, '');

  if (digits.startsWith('00')) digits = digits.slice(2);

  if (
    cc &&
    digits.startsWith(cc) &&
    (explicitPrefix || digits.length - cc.length >= 6)
  ) {
    digits = digits.slice(cc.length);
  }

  return digits.replace(/^0+/, '');
}

/** Full E.164, built from the chip's dial code and the national part. */
export function toE164(dialCode: string, entered: string): string {
  return `+${dialDigits(dialCode)}${nationalPart(dialCode, entered)}`;
}

/**
 * The inverse of {@link toE164}: splits a stored number back into the chip and
 * the field, so the signup form can be re-opened on a number the user already
 * submitted.
 *
 * Longest dial code wins, so +971 is not read as +97 or +9. Ties go to the
 * first entry in COUNTRIES — "+1" resolves to the United States rather than
 * Canada, which is a guess either way and only affects which flag is shown.
 * A number whose country is not in COUNTRIES cannot be represented, so it falls
 * back to the default chip with every digit left in the field — visibly wrong,
 * which is the point: the user has to pick the right country before saving, and
 * saving as-is would prefix the default dial code. Nothing this app writes can
 * land there, since every number it stores was entered through this same list.
 */
export function splitE164(e164: string): { country: Country; national: string } {
  const fallback = { country: COUNTRIES[0], national: '' };
  const digits = (e164 || '').replace(/\D/g, '');
  if (!digits) return fallback;

  let best: Country | null = null;
  for (const c of COUNTRIES) {
    const cc = dialDigits(c.code);
    if (!digits.startsWith(cc)) continue;
    if (!best || cc.length > dialDigits(best.code).length) best = c;
  }

  if (!best) return { ...fallback, national: digits };
  return { country: best, national: digits.slice(dialDigits(best.code).length) };
}

/**
 * Per-country rules for the national part of a mobile number.
 *
 * The old check was `digits.length < 5` — one loose rule for every country, so
 * a Pakistani number could be submitted eight digits short and only fail later,
 * at the SMS that never arrived. The server is barely stricter (E.164's generic
 * `+[1-9]\d{7,14}`), and it cannot be: it has no country context by the time it
 * sees the number. This screen does, because the user picked the flag.
 *
 * `lengths` is the national significant number — what is left after the dial
 * code and the trunk '0' are stripped, which is exactly what {@link
 * nationalPart} returns. `prefix` narrows it to mobile ranges: every number
 * entered here has to receive an OTP, so a valid landline is still the wrong
 * number.
 *
 * Keyed by `Country.code` so "+1 CA" and "+1" can differ if they ever need to.
 */
export interface PhoneRule {
  /** Allowed national-number lengths, ascending. */
  lengths: number[];
  /** The national number must match this to be a mobile. */
  prefix: RegExp;
  /** How `prefix` reads in an error message, e.g. "3" or "6 or 7". */
  prefixLabel: string;
  /** A real, valid national number — placeholder text and error examples. */
  example: string;
}

export const PHONE_RULES: Record<string, PhoneRule> = {
  '+92':   { lengths: [10],     prefix: /^3/,      prefixLabel: '3',        example: '3001234567' },
  '+971':  { lengths: [9],      prefix: /^5/,      prefixLabel: '5',        example: '501234567' },
  '+966':  { lengths: [9],      prefix: /^5/,      prefixLabel: '5',        example: '512345678' },
  '+44':   { lengths: [10],     prefix: /^7/,      prefixLabel: '7',        example: '7700900123' },
  '+1':    { lengths: [10],     prefix: /^[2-9]/,  prefixLabel: '2-9',      example: '2015550123' },
  '+1 CA': { lengths: [10],     prefix: /^[2-9]/,  prefixLabel: '2-9',      example: '4165550123' },
  '+61':   { lengths: [9],      prefix: /^4/,      prefixLabel: '4',        example: '412345678' },
  '+974':  { lengths: [8],      prefix: /^[3567]/, prefixLabel: '3, 5, 6 or 7', example: '33123456' },
  '+968':  { lengths: [8],      prefix: /^[79]/,   prefixLabel: '7 or 9',   example: '91234567' },
  '+965':  { lengths: [8],      prefix: /^[569]/,  prefixLabel: '5, 6 or 9', example: '51234567' },
  '+973':  { lengths: [8],      prefix: /^3/,      prefixLabel: '3',        example: '36123456' },
  '+60':   { lengths: [9, 10],  prefix: /^1/,      prefixLabel: '1',        example: '123456789' },
  '+49':   { lengths: [10, 11], prefix: /^1[5-7]/, prefixLabel: '15, 16 or 17', example: '15112345678' },
  '+47':   { lengths: [8],      prefix: /^[49]/,   prefixLabel: '4 or 9',   example: '40612345' },
  '+45':   { lengths: [8],      prefix: /^[2-9]/,  prefixLabel: '2-9',      example: '20123456' },
  '+39':   { lengths: [9, 10],  prefix: /^3/,      prefixLabel: '3',        example: '3123456789' },
  '+34':   { lengths: [9],      prefix: /^[67]/,   prefixLabel: '6 or 7',   example: '612345678' },
  '+90':   { lengths: [10],     prefix: /^5/,      prefixLabel: '5',        example: '5301234567' },
  '+27':   { lengths: [9],      prefix: /^[6-8]/,  prefixLabel: '6, 7 or 8', example: '711234567' },
  '+64':   { lengths: [8, 9, 10], prefix: /^2/,    prefixLabel: '2',        example: '211234567' },
  '+353':  { lengths: [9],      prefix: /^8/,      prefixLabel: '8',        example: '851234567' },
  '+33':   { lengths: [9],      prefix: /^[67]/,   prefixLabel: '6 or 7',   example: '612345678' },
};

/** The rule for a chip code, or null when the country has none. */
export function phoneRuleFor(code: string): PhoneRule | null {
  return PHONE_RULES[code] ?? null;
}

/** "8", "9 or 10", "8, 9 or 10" — lengths as an English list. */
function joinLengths(lengths: number[]): string {
  if (lengths.length === 1) return String(lengths[0]);
  return `${lengths.slice(0, -1).join(', ')} or ${lengths[lengths.length - 1]}`;
}

/** The country's name, for error copy. Falls back to the dial code. */
function countryName(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.name ?? code;
}

/**
 * Why `entered` is not a valid mobile number for `code`, or null if it is.
 *
 * Takes what the user typed, not a cleaned number: it normalises through
 * {@link nationalPart} first, so a number pasted as +923001234567, 03001234567
 * or 3001234567 all validate identically — the same normalisation
 * {@link toE164} applies before submitting.
 */
export function nationalNumberProblem(
  code: string,
  entered: string,
): string | null {
  const national = nationalPart(code, entered);
  if (!national) return 'Please enter your mobile number.';

  const rule = phoneRuleFor(code);
  if (!rule) {
    // Unknown country — fall back to the server's own E.164 bounds so the app
    // never rejects a number the API would have taken.
    const total = dialDigits(code).length + national.length;
    return total >= 8 && total <= 15
      ? null
      : 'Please enter a valid mobile number.';
  }

  const name = countryName(code);
  if (!rule.lengths.includes(national.length)) {
    return `${name} mobile numbers are ${joinLengths(rule.lengths)} digits. Example: ${rule.example}.`;
  }
  if (!rule.prefix.test(national)) {
    return `${name} mobile numbers start with ${rule.prefixLabel}. Example: ${rule.example}.`;
  }
  return null;
}

/**
 * The same check for a number that arrives already in E.164 — the "change
 * number" field and the forgot-password form, where there is no country chip
 * to read. Unrecognised country codes fall back to the generic E.164 rule.
 */
export function e164Problem(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your mobile number.';
  if (!/^\+[1-9]\d{6,14}$/.test(trimmed)) {
    return 'Use the international format, e.g. +923001234567.';
  }
  const { country, national } = splitE164(trimmed);
  // splitE164 falls back to COUNTRIES[0] when nothing matched, and reports the
  // whole number as national. Treat that as "country unknown" rather than as
  // Pakistan, or a French number would be told it must start with 3.
  const matched = `+${dialDigits(country.code)}`;
  if (!trimmed.startsWith(matched)) return null;
  return nationalNumberProblem(country.code, national);
}
