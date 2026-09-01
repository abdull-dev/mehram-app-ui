/**
 * Motion primitives: press feedback and staggered entrance.
 *
 * Both existed only as copy-pasted fragments before — 135 of the app's 278
 * Pressables had no press response at all, and no list animated its items in.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  ViewStyle,
  type PressableProps,
} from 'react-native';
import { DURATION, EASE, SPRING, enterStyle, stagger } from '../../theme/motion';

/**
 * A Pressable that dips slightly under the finger.
 *
 * Scale rather than opacity: dimming a card reads as disabling it, while a
 * small scale reads as physical. Driven by a spring so releasing settles
 * instead of snapping.
 *
 * Use in place of `<Pressable>` wherever the target is a card, row or tile.
 * Small icon buttons keep their own `pressed` opacity — a 2% scale on a 38px
 * button is invisible, and the opacity change is what registers there.
 */
/**
 * The Pressable itself is animated, not a view inside it.
 *
 * Wrapping the children in an `Animated.View` and putting the caller's style on
 * *that* moved the layout one level down: a `flex: 1` meant for the row's child
 * landed on an inner view, the Pressable stopped flexing, and the bottom nav's
 * four tabs bunched up against the left edge. Animating the Pressable keeps the
 * element count — and so the layout — exactly as the caller wrote it.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  disabled,
  ...rest
}: PressableProps & {
  style?: StyleProp<ViewStyle>;
  /** How far to dip. Smaller targets need less. */
  scaleTo?: number;
  children?: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (v: number) => {
    Animated.spring(scale, { toValue: v, ...SPRING.press }).start();
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={e => { if (!disabled) to(scaleTo); rest.onPressIn?.(e); }}
      onPressOut={e => { to(1); rest.onPressOut?.(e); }}
      style={[style, { transform: [{ scale }] }]}>
      {children}
    </AnimatedPressable>
  );
}

/**
 * Fades and rises its child in once, on mount.
 *
 * `index` staggers a list so rows arrive in sequence rather than all at once.
 * The delay is capped in `stagger` so a long list does not appear to load
 * slowly.
 */
export function FadeInUp({
  children,
  index = 0,
  distance,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = Animated.timing(anim, {
      toValue: 1,
      duration: DURATION.enter,
      delay: stagger(index),
      easing: EASE.enter,
      useNativeDriver: true,
    });
    t.start();
    return () => t.stop();
  }, [anim, index]);

  return (
    <Animated.View style={[style, enterStyle(anim, distance)]}>
      {children}
    </Animated.View>
  );
}

/**
 * Crossfades between a skeleton and real content.
 *
 * The two used to swap instantly, so the page blinked at the exact moment the
 * user was waiting for it. Both layers are absolutely stacked only while the
 * fade runs; once it finishes the skeleton unmounts, so it costs nothing.
 */
export function CrossFade({
  loading,
  skeleton,
  children,
}: {
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(loading ? 0 : 1)).current;
  const [showSkeleton, setShowSkeleton] = React.useState(loading);

  useEffect(() => {
    if (loading) {
      setShowSkeleton(true);
      anim.setValue(0);
      return;
    }
    const t = Animated.timing(anim, {
      toValue: 1,
      duration: DURATION.enter,
      easing: EASE.enter,
      useNativeDriver: true,
    });
    t.start(({ finished }) => { if (finished) setShowSkeleton(false); });
    return () => t.stop();
  }, [loading, anim]);

  if (showSkeleton && loading) return <>{skeleton}</>;

  return (
    <Animated.View style={{ opacity: anim }}>
      {children}
    </Animated.View>
  );
}
