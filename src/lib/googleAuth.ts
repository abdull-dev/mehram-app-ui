/**
 * Google sign-in through Supabase's own OAuth flow.
 *
 * No Google SDK and no client IDs live in the app. Supabase holds the Google
 * credentials and does the exchange; the app only opens a URL and reads the
 * session back off the redirect. That is why this needs no native dependency
 * and works on both platforms from the current build.
 *
 * The app's backend needs no new endpoint either: `SupabaseAuthGuard` resolves
 * a user from any valid access token and `resolveOrCreateUser` bootstraps the
 * row on first sight, so the first `/auth/me` after this creates the account.
 *
 * ── Required Supabase dashboard setup (one time, not code) ──────────────────
 *   1. Authentication → Providers → Google → enable, and paste a Google Cloud
 *      OAuth client ID + secret.
 *   2. Authentication → URL Configuration → Redirect URLs → add
 *      `mehram://auth-callback`.
 * Until both are done this returns a clear error rather than a broken browser
 * tab, which is what `GOOGLE_SIGN_IN_ENABLED` gates on.
 */
import { Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { supabase } from './supabase';
import { saveTokens } from '../storage/authStorage';

/** Must match the scheme registered in both native projects. */
export const OAUTH_REDIRECT = 'mehram://auth-callback';

export class GoogleAuthError extends Error {}

/**
 * Supabase returns the session in the redirect's URL fragment, not its query,
 * so the tokens have to be parsed out of the part after `#`.
 */
function tokensFromRedirect(url: string): { access: string; refresh: string } | null {
  const hash = url.split('#')[1];
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  return access && refresh ? { access, refresh } : null;
}

/** Turns a redirect that carries no tokens into the reason it did not. */
function refusalReason(url: string): string {
  const desc = new URLSearchParams(url.split('#')[1] ?? '').get('error_description');
  return desc ?? 'Google sign-in was cancelled.';
}

/**
 * Opens Google inside the app and stores the session.
 *
 * Uses an in-app browser — Custom Tabs on Android, SFSafariViewController on
 * iOS — rather than handing off to Chrome or Safari. The app stays in place and
 * the sheet closes itself on the redirect.
 *
 * Deliberately *not* a WebView: Google refuses OAuth in embedded WebViews with
 * "this browser or app may not be secure" (disallowed_useragent), because a
 * host app can read keystrokes in one. Custom Tabs and SFSafariViewController
 * are separate processes with the system's own cookie jar, which is why Google
 * permits them and why they are the only way to do this in-app.
 *
 * `openAuth` captures the redirect natively and returns it, so no `Linking`
 * listener has to race the browser closing. `Linking` remains the fallback for
 * a device with no Custom Tabs provider at all.
 */
export async function signInWithGoogle(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: OAUTH_REDIRECT,
      // The app opens the URL itself — letting the SDK redirect would try to
      // navigate a web page that does not exist here.
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    throw new GoogleAuthError(
      error?.message ??
        'Google sign-in is not configured yet. Enable the Google provider in Supabase.',
    );
  }

  let redirect: string;

  // Attempted unconditionally rather than gated on `isAvailable()`.
  //
  // That check asks Android whether a Custom Tabs *service* can be bound, and
  // it answers false in situations where `openAuth` works perfectly well — a
  // cold Chrome process being the common one. Gating on it silently sent the
  // whole flow to the system browser, which is the opposite of the intent. So
  // the in-app sheet is the default and the browser is reached only if opening
  // it actually fails.
  try {
    const result = await InAppBrowser.openAuth(data.url, OAUTH_REDIRECT, {
      // Chrome-less and dismissible: this is a step in a flow, not a browser.
      ephemeralWebSession: false,
      showTitle: false,
      enableUrlBarHiding: true,
      enableDefaultShare: false,
      // Matches the app's own ground so the sheet does not flash white.
      toolbarColor: '#F6F5FA',
      preferredBarTintColor: '#F6F5FA',
      preferredControlTintColor: '#4C3FA8',
      modalEnabled: true,
      dismissButtonStyle: 'cancel',
    });

    // 'cancel' is the user backing out, 'dismiss' the sheet closing without a
    // redirect. Neither is an error worth shouting about.
    if (result.type !== 'success' || !result.url) {
      // A deliberate cancel, not a reason to try again in a browser.
      throw new GoogleAuthError('Google sign-in was cancelled.');
    }
    redirect = result.url;
  } catch (e) {
    // A cancellation must not fall through to the browser — the user closed it.
    if (e instanceof GoogleAuthError) throw e;

    // The in-app sheet could not open at all: no Custom Tabs provider on the
    // device. Falls back to the system browser and waits for the deep link,
    // which is why the URL scheme stays registered on both platforms.
    //
    // Logged as a warning because falling back is a downgrade, not normal —
    // seeing this in logcat is how you know the in-app path failed rather
    // than never having been attempted.
    console.warn(
      '[googleAuth] in-app browser unavailable, using the system browser:',
      e instanceof Error ? e.message : e,
    );
    redirect = await new Promise<string>((resolve, reject) => {
      const sub = Linking.addEventListener('url', ({ url }) => {
        if (!url.startsWith(OAUTH_REDIRECT)) return;
        sub.remove();
        resolve(url);
      });
      Linking.openURL(data.url).catch(err => {
        sub.remove();
        reject(new GoogleAuthError(err?.message ?? 'Could not open Google sign-in.'));
      });
    });
  }

  const tokens = tokensFromRedirect(redirect);
  if (!tokens) throw new GoogleAuthError(refusalReason(redirect));

  // Saved to the app's own storage, which is what `apiRequest` reads. The
  // Supabase client is configured with `persistSession: false`, so it keeps no
  // copy of its own and the two cannot drift.
  await saveTokens(tokens.access, tokens.refresh);
}
