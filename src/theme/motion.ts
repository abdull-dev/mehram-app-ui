import { Animated, Easing } from 'react-native';

/**
 * One motion language for the whole app.
 *
 * Durations and curves were previously written out per screen, so the same
 * gesture felt different depending on where you were. These are the shared
 * values; anything bespoke should be a deliberate exception, not a fourth
 * slightly-different fade.
 *
 * Everything here drives `transform` or `opacity` only, so every animation can
 * run on the native driver and stays smooth while JS is busy.
 */
export const DURATION = {
  /** Press feedback — must feel instant. */
  press: 90,
  /** Content entering: cards, rows, sections. */
  enter: 320,
  /** Page-to-page transitions. */
  page: 300,
} as const;

/**
 * Decelerating curve for content arriving: quick to start, gentle to settle.
 * `Easing.bezier` rather than `Easing.out(Easing.ease)` because the latter
 * eases out too early and reads as sluggish at these durations.
 */
export const EASE = {
  enter: Easing.bezier(0.22, 1, 0.36, 1),
  exit: Easing.bezier(0.4, 0, 1, 1),
} as const;

/**
 * Spring for anything the user directly caused — a press, a toggle.
 *
 * Tuned to settle without visible wobble: a bouncy spring reads as playful,
 * which is not what this app is. `Animated.spring` was unused anywhere before;
 * every interaction was a fixed-duration timing curve, which is what makes
 * taps feel mechanical.
 */
export const SPRING = {
  /** Snappy, no overshoot — for press states. */
  press: { damping: 22, stiffness: 320, mass: 0.7, useNativeDriver: true },
  /** Softer, for larger movements. */
  settle: { damping: 18, stiffness: 180, mass: 0.9, useNativeDriver: true },
} as const;

/**
 * Per-item delay for a staggered list entrance.
 *
 * Capped: past a handful of items the delay stops reading as choreography and
 * starts reading as the list being slow to load.
 */
export function stagger(index: number, step = 55, cap = 6): number {
  return Math.min(index, cap) * step;
}

/** Fade + rise, the app's standard entrance. Native-driver safe. */
export function enterStyle(anim: Animated.Value, distance = 14) {
  return {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  };
}
