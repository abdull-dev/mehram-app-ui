/**
 * Display name helpers.
 *
 * Registration has no name field, so the server seeds `fullName` with the local
 * part of the email address — `wowarej751` for `wowarej751@example.com`. It is a
 * placeholder, not a name the user ever typed, and greeting somebody by it
 * ("wowarej751, add your wali") reads as the app having got their name wrong.
 * Every screen that shows a stored name therefore has to tell the two apart.
 */

/** True when `fullName` is only the registration placeholder from `email`. */
export function isPlaceholderName(
  fullName?: string | null,
  email?: string | null,
): boolean {
  const stored = fullName?.trim().toLowerCase();
  if (!stored) return false;
  const localPart = email?.split('@')[0]?.trim().toLowerCase();
  return !!localPart && stored === localPart;
}

/**
 * The user's first name for greetings, or '' when the account has no real name
 * yet — callers fall back to a name-less wording rather than show the
 * placeholder.
 */
export function firstNameFrom(
  fullName?: string | null,
  email?: string | null,
): string {
  const name = fullName?.trim();
  if (!name || isPlaceholderName(name, email)) return '';
  return name.split(' ')[0];
}
