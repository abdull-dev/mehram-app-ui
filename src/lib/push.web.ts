/**
 * `push.ts` for the web — no FCM, and honest about it.
 *
 * The native module cannot load here at all: `@react-native-firebase/app`
 * deep-imports two Flow-typed React Native internals
 * (`Libraries/Utilities/binaryToBase64`, `Libraries/vendor/emitter/EventEmitter`)
 * which bypass the `react-native` → react-native-web alias and fail to parse,
 * and `push.ts` calls `getMessaging()` at module scope, so merely importing it
 * would throw before any screen rendered.
 *
 * Web push is a different mechanism — the Firebase JS SDK, a service worker and
 * a VAPID key — and none of it is set up, so every function here is a no-op
 * rather than a half-implementation that looks wired. Nothing is lost while the
 * tab is open: `notificationChannel.ts` keeps a Supabase channel for exactly
 * that case, and it is what refreshes the screen on both platforms. What the
 * web does not get is delivery while the tab is closed.
 *
 * The signatures mirror `push.ts` exactly, including the unsubscribe functions,
 * so App.tsx's effects clean up the same way on every platform.
 */

/** Same shape as the native module's — the server sends one payload. */
export interface PushData {
  type?: string;
  matchId?: string;
  conversationId?: string;
  senderId?: string;
  interestId?: string;
  [key: string]: string | undefined;
}

/** Nothing to grant: there is no push channel to grant it for. */
export async function requestPushPermission(): Promise<boolean> {
  return false;
}

/**
 * No token to register.
 *
 * Returning null rather than throwing keeps this the same non-event it is on a
 * device that declines the permission — the caller already treats a null token
 * as "this device does not get push" and carries on.
 */
export async function registerPushToken(): Promise<string | null> {
  return null;
}

/** Nothing was ever registered, so there is nothing to withdraw. */
export async function unregisterPushToken(): Promise<void> {}

export function subscribeToTokenRefresh(): () => void {
  return () => {};
}

export function subscribeToForegroundMessages(
  _handler: (data: PushData) => void,
): () => void {
  return () => {};
}

export function subscribeToNotificationTaps(
  _onOpen: (data: PushData) => void,
): () => void {
  return () => {};
}
