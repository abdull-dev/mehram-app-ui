import { initialWindowMetrics } from 'react-native-safe-area-context';

/**
 * Seed metrics for `SafeAreaProvider`.
 *
 * The provider renders *nothing* until it knows its insets, so passing these
 * removes the blank first frame. On a device React Native hands them over
 * synchronously as native constants; see safeAreaMetrics.web.ts for why the
 * browser needs its own answer.
 */
export const INITIAL_SAFE_AREA_METRICS = initialWindowMetrics;
