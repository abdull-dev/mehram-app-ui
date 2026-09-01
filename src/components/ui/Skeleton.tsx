/**
 * Skeleton primitives.
 *
 * A pulsing grey block stands in for content that is still loading. The
 * alternative — rendering the real layout with empty values — collapses the
 * card to whatever is left and then jumps as each field lands, which reads as a
 * broken screen rather than a loading one.
 *
 * Extracted from IntroductionAvailableBlock, which defined all three of these
 * privately. The settings screen needs the same treatment, and a second copy of
 * a pulse animation is how two loading states end up breathing at different
 * rates on the same screen.
 */

import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/** Opacity loop shared by every bone, so they pulse in step. */
export function usePulse() {
  const anim = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);
  return anim;
}

interface BoneProps {
  w: number | string;
  h: number;
  radius?: number;
  style?: object;
}

/** A placeholder block for use on a light background. */
export function Bone({ w, h, radius = 8, style }: BoneProps) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        { width: w as any, height: h, borderRadius: radius, backgroundColor: '#E2DFF0' },
        { opacity },
        style,
      ]}
    />
  );
}

/** The same, tuned for a dark or gradient background. */
export function DarkBone({ w, h, radius = 8, style }: BoneProps) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        { width: w as any, height: h, borderRadius: radius, backgroundColor: 'rgba(255,255,255,0.15)' },
        { opacity },
        style,
      ]}
    />
  );
}
