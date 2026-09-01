import type { ViewStyle } from 'react-native';

/**
 * Absolute fill for a gradient sitting *behind* a card's content.
 *
 * `LinearGradient` used as the layout container does not reliably grow to its
 * children on iOS: a card rendered short and its `borderRadius` mask cut
 * through the last row of content — numbers sliced in half, labels gone. The
 * same markup sized correctly on Android, so it only showed up on iOS.
 *
 * The fix everywhere is the same shape: a plain `View` owns the layout (its
 * height is Yoga's to compute, identically on both platforms) and the gradient
 * fills behind it. Pair this with `overflow: 'hidden'` on the container so the
 * gradient is still clipped to the rounded corners.
 */
export const GRADIENT_FILL: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
