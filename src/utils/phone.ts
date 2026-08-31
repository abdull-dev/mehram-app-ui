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
