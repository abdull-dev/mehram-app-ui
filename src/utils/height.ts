/**
 * Height conversion.
 *
 * The app talks feet and inches; the API stores `heightCm` and validates it as
 * an integer in [120, 250] (`UpdateProfileDto`). Every screen converts at the
 * boundary — nothing sends feet to the server.
 *
 * This lives in one place because five screens had grown their own copy of the
 * formatter, and they did not agree: see `cmToFeetInches` for the rounding bug
 * three of them shared.
 */

export const CM_PER_INCH = 2.54;

/** What the server accepts for `heightCm`; mirrored so the UI can validate. */
export const MIN_HEIGHT_CM = 120;
export const MAX_HEIGHT_CM = 250;

export interface FeetInches {
  feet: number;
  inches: number;
}

/**
 * Rounds to whole inches *before* splitting, which the naive version did not.
 *
 * Taking `Math.floor(totalInches / 12)` and `Math.round(totalInches % 12)`
 * separately lets the remainder round up to 12 and renders 182.7cm as
 * "5ft 12in" instead of "6ft". Rounding first makes that unrepresentable.
 */
export function cmToFeetInches(cm: number): FeetInches {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_INCH);
}

/** Display form, e.g. `5ft 7in` — or `5ft` exactly on the foot. */
export function formatHeight(cm?: number | null): string | null {
  if (!cm) return null;
  const { feet, inches } = cmToFeetInches(cm);
  return inches > 0 ? `${feet}ft ${inches}in` : `${feet}ft`;
}

/** True when a height is inside what the server will accept. */
export function isHeightInRange(cm: number): boolean {
  return Number.isFinite(cm) && cm >= MIN_HEIGHT_CM && cm <= MAX_HEIGHT_CM;
}
