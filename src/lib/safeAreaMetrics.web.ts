import type { Metrics } from 'react-native-safe-area-context';

/**
 * Seed metrics for `SafeAreaProvider` in a browser.
 *
 * `initialWindowMetrics` is hard-coded to null on web — the library measures
 * insets from a probe element in an effect instead. The provider renders `null`
 * for as long as it has none, so without a seed the very first render produces
 * an empty page and the app never appears.
 *
 * Zero insets and the window's own size are the right starting point: a desktop
 * browser has no notch, and where there is one (iOS Safari) the library's own
 * measurement arrives a frame later and replaces these.
 */
export const INITIAL_SAFE_AREA_METRICS: Metrics = {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: {
    x: 0,
    y: 0,
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  },
};
