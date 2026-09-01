/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

/**
 * Background/quit-state message handler.
 *
 * Has to be registered here, outside the React tree: when a data message
 * arrives with the app killed, the OS spins up the JS context and calls this
 * before any component mounts. Registered inside App it would never run.
 *
 * Nothing to do but resolve — the notification itself is rendered by the OS
 * from the payload's `notification` block, and the app reads the fresh state
 * when it opens. It exists because Firebase warns loudly without it, and
 * because a rejected promise here shows as a crash in the notification logs.
 */
setBackgroundMessageHandler(getMessaging(), async () => {});

/**
 * Silence one library log that the app already handles.
 *
 * `react-native-iap` logs every error through an unconditional
 * `console.error` — its own debug module is documented as "silent for all
 * library users", but the `error` branch ignores that and always writes. In a
 * dev build LogBox promotes any console.error to a full-screen red overlay.
 *
 * Play's billing client disconnects on its own — the Store updating itself, the
 * service being reclaimed while backgrounded — and only tells us via the error
 * on the next call. `queryPurchases` in src/lib/iap.ts catches exactly that,
 * marks the connection stale so the next call reconnects, and returns no
 * purchases. It is an expected, recovered condition, not a fault.
 *
 * So the overlay reported a non-problem and buried the screen while doing it.
 * Narrow on purpose: only this one message is suppressed, so every other
 * RN-IAP error still surfaces.
 */
if (__DEV__) {
  LogBox.ignoreLogs([/\[RN-IAP\] Failed to get available purchases/]);
}

AppRegistry.registerComponent(appName, () => App);
