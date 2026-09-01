/**
 * The word a button shows while its action is running.
 *
 * Every button used to say "Loading…", which describes the app rather than
 * what the user just asked for: tapping "Sign in" and being told "Loading…"
 * loses the one piece of feedback that confirms the right thing is happening.
 *
 * Deliberately a lookup rather than a conjugator. Turning arbitrary label text
 * into a progressive form gets the common cases right and the rest badly wrong
 * — "Got it" becomes "Gotting it" — and this is copy the user reads. An
 * unmapped label keeps the old generic wording, which is safe if bland; pass
 * `loadingLabel` explicitly for anything not listed here.
 */
const BUSY_LABELS: Record<string, string> = {
  'Continue': 'Continuing…',
  'Continue to signup': 'Continuing…',
  'Sign in': 'Signing in…',
  'Get started': 'Getting started…',
  'Go to Home': 'Opening…',
  'Add my wali': 'Adding…',
  'Finish my biodata': 'Saving…',
  'Next question': 'Saving…',
  'Save and send codes': 'Saving…',
  'Verify email': 'Verifying…',
  'Become a member': 'Processing…',
  'Invite on WhatsApp': 'Creating invite…',
  'Pick up where I left off': 'Opening…',
};

/** Fallback used when a label has no specific busy wording. */
export const GENERIC_BUSY_LABEL = 'Loading…';

export function busyLabelFor(label: string): string {
  return BUSY_LABELS[label.trim()] ?? GENERIC_BUSY_LABEL;
}
