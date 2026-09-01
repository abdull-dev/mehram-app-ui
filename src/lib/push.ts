/**
 * Firebase Cloud Messaging — device registration and message handling.
 *
 * Push and Realtime solve different halves of the same problem, and this app
 * only had the second. `notificationChannel.ts` keeps an open Supabase channel
 * so a screen the user is looking at stays fresh; it needs a live WebSocket, so
 * it stops the moment the app is backgrounded. FCM is what reaches the user
 * when the app is closed.
 *
 * Nothing here decides *whether* to send. The server already gates every push
 * on the same six booleans the notification settings screen writes
 * (`isPreferenceEnabled` in notifications.service.ts), and it gates the in-app
 * row on the identical check, so the two can never disagree. Re-filtering on
 * the client would only add a second opinion that drifts.
 *
 * The OS-level switch is separate and outranks all of it: a user who denies the
 * notification permission gets no tray notification regardless of preferences.
 */
import { Platform, PermissionsAndroid } from 'react-native';
// Modular API: @react-native-firebase v22 dropped the `messaging().x()`
// namespaced form and v26 removed the default export with it, so every call
// takes the Messaging instance as its first argument.
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { registerDeviceToken, unregisterDeviceToken } from '../api/notifications';

/** One instance for the module; `getMessaging()` resolves the default app. */
const fcm = getMessaging();

/** Payload the server attaches to every push (`notifications.listener.ts`). */
export interface PushData {
  type?: string;
  matchId?: string;
  conversationId?: string;
  senderId?: string;
  interestId?: string;
  [key: string]: string | undefined;
}

/**
 * The token this device last registered.
 *
 * Kept so sign-out can unregister the exact token it registered. Asking FCM
 * again at that point usually returns the same value, but not after a token
 * refresh mid-session — and deleting the wrong one leaves the old row live,
 * pushing the previous user's proposals to whoever signs in next.
 */
let registeredToken: string | null = null;

/**
 * Ask for the OS notification permission.
 *
 * Android 13+ needs POST_NOTIFICATIONS at runtime; below that the manifest
 * entry is enough and the request resolves as already-granted. iOS always
 * prompts through Firebase.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Number(Platform.Version) < 33) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  const status = await requestPermission(fcm);
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

/**
 * Register this device against the signed-in user.
 *
 * Safe to call on every launch: the server upserts on the token, so a repeat
 * is a no-op and a reinstall re-points the row at whoever is now signed in.
 * Silent on failure — a device that cannot register push is still a working
 * app, and an error dialog here would interrupt a launch to report something
 * the user cannot act on.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    if (!(await requestPushPermission())) return null;
    const token = await getToken(fcm);
    if (!token) return null;
    await registerDeviceToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
    registeredToken = token;
    return token;
  } catch {
    return null;
  }
}

/**
 * Drop this device's token. Call before clearing the session, while the
 * request can still authenticate as the user who owns the row.
 */
export async function unregisterPushToken(): Promise<void> {
  const token = registeredToken ?? (await getToken(fcm).catch(() => null));
  if (!token) return;
  try {
    await unregisterDeviceToken(token);
  } catch {
    // Sign-out must not fail because the network did. A stale row is corrected
    // by the next registration, which upserts this token onto its new owner.
  }
  registeredToken = null;
}

/**
 * FCM rotates tokens (app restore, reinstall, storage clear). The old one stops
 * delivering the moment it does, so re-register or the device goes quiet with
 * nothing to show for it.
 */
export function subscribeToTokenRefresh(): () => void {
  return onTokenRefresh(fcm, async (token: string) => {
    try {
      await registerDeviceToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
      registeredToken = token;
    } catch {}
  });
}

/**
 * Messages that arrive while the app is in the foreground.
 *
 * Android does not raise a tray notification for these — the app is already
 * on screen, so the OS hands the payload straight to us. The right response is
 * to refresh what is on screen, which the Supabase channel is already doing
 * for the same events, so this only nudges the unread count.
 */
export function subscribeToForegroundMessages(
  handler: (data: PushData) => void,
): () => void {
  return onMessage(fcm, (msg: RemoteMessage) => {
    handler((msg.data ?? {}) as PushData);
  });
}

/**
 * Taps on a notification, from both states that produce one:
 *
 *   background  the app was alive → onNotificationOpenedApp
 *   quit        the app was not   → getInitialNotification, once, at startup
 *
 * Handling only the first is the usual bug: the notification works while the
 * app is in the recents list and does nothing after the OS has reclaimed it.
 */
export function subscribeToNotificationTaps(
  onOpen: (data: PushData) => void,
): () => void {
  getInitialNotification(fcm)
    .then(msg => {
      if (msg) onOpen((msg.data ?? {}) as PushData);
    })
    .catch(() => {});

  return onNotificationOpenedApp(fcm, (msg: RemoteMessage) => {
    onOpen((msg.data ?? {}) as PushData);
  });
}
