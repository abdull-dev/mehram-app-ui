/**
 * OrbitHero
 *
 * Animated orbital icon hero used on the welcome / feature highlight screens.
 * Mirrors the `.orb` component from the HTML prototype exactly:
 *
 *   • Outer dashed ring     → rotates CW  26 s linear (CSS: spin)
 *   • Inner solid ring      → static (reference circle)
 *   • Satellite dots (×3)   → rotate CCW 18 s linear (CSS: spinb)
 *   • Gradient core         → floats up/down 4.6 s ease-in-out (CSS: float)
 *
 * Colour tones:
 *   rose  — pink gradient core, rose-tinted rings (F1 Welcome)
 *   vio   — violet gradient core, violet-tinted rings (F2 Welcome)
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { GradientColors } from '../../theme/colors';

// ─── icon paths (24 × 24 viewBox) ────────────────────────────────────────────
const ICON_PATHS: Record<string, string> = {
  heart:
    'M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20z',
  shield:
    'M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z M9 12l2 2 4-4',
  user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
};

export type OrbitTone = 'rose' | 'vio';
export type OrbitIcon = 'heart' | 'shield' | 'user';

interface OrbitHeroProps {
  tone?: OrbitTone;
  icon?: OrbitIcon;
}

// ─── layout constants (px) — scaled ~1.27× for real phone screens ────────────
const ORB_SIZE = 190;
const CORE_INSET = 37; // top/left/right/bottom inset for the core circle
const CORE_SIZE = ORB_SIZE - CORE_INSET * 2; // 116 px
const RING2_INSET = 19;
const RING2_SIZE = ORB_SIZE - RING2_INSET * 2; // 152 px
const RING_R = ORB_SIZE / 2 - 2; // radius of the dashed SVG ring (93 px)

// ─── satellite dot specs — mirrors position: absolute rules in HTML ───────────
const SATELLITES: Array<{
  w: number;
  h: number;
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
  opacity: number;
}> = [
  { w: 11, h: 11, top: 3, left: 81, opacity: 1 },
  { w: 8, h: 8, bottom: 18, left: 20, opacity: 0.75 },
  { w: 9, h: 9, top: 66, right: 0, opacity: 0.6 },
];

export function OrbitHero({ tone = 'rose', icon = 'heart' }: OrbitHeroProps) {
  // ─── animation values ─────────────────────────────────────────────────────
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinBackAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // CW rotation — 26 s per revolution
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 26_000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // CCW rotation — 18 s per revolution
    Animated.loop(
      Animated.timing(spinBackAnim, {
        toValue: 1,
        duration: 18_000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Floating — 4.6 s ease-in-out, ±8 px vertical
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2_300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2_300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [floatAnim, spinAnim, spinBackAnim]);

  const spinDeg = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const spinBackDeg = spinBackAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  // ─── tone-driven style values ─────────────────────────────────────────────
  const isRose = tone === 'rose';
  const ringColor = isRose ? 'rgba(242,120,159,0.44)' : 'rgba(155,123,240,0.42)';
  const ring2Color = isRose ? 'rgba(242,120,159,0.18)' : 'rgba(155,123,240,0.16)';
  const satColor = isRose ? '#F2789F' : '#9B7BF0';
  const coreColors = isRose ? GradientColors.orbitRose : GradientColors.orbitVio;
  const coreShadowColor = isRose ? '#BE5AB4' : '#5B41B8';
  const iconPath = ICON_PATHS[icon] || ICON_PATHS.heart;

  return (
    <View style={styles.container}>
      {/* ── Outer dashed ring — rotates CW ─────────────────────────────── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ rotate: spinDeg }] }]}>
        <Svg width={ORB_SIZE} height={ORB_SIZE}>
          <Circle
            cx={ORB_SIZE / 2}
            cy={ORB_SIZE / 2}
            r={RING_R}
            stroke={ringColor}
            strokeWidth={1.6}
            strokeDasharray="4 6"
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* ── Inner solid ring — static ───────────────────────────────────── */}
      <View
        style={[
          styles.ring2,
          {
            top: RING2_INSET,
            left: RING2_INSET,
            width: RING2_SIZE,
            height: RING2_SIZE,
            borderRadius: RING2_SIZE / 2,
            borderColor: ring2Color,
          },
        ]}
      />

      {/* ── Satellite dots — rotate CCW ─────────────────────────────────── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ rotate: spinBackDeg }] }]}>
        {SATELLITES.map((s, idx) => (
          <View
            key={idx}
            style={{
              position: 'absolute',
              width: s.w,
              height: s.h,
              borderRadius: s.w / 2,
              backgroundColor: satColor,
              top: s.top,
              left: s.left,
              bottom: s.bottom,
              right: s.right,
              opacity: s.opacity,
            }}
          />
        ))}
      </Animated.View>

      {/* ── Floating gradient core ──────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.coreWrapper,
          {
            top: CORE_INSET,
            left: CORE_INSET,
            width: CORE_SIZE,
            height: CORE_SIZE,
            shadowColor: coreShadowColor,
            transform: [{ translateY: floatAnim }],
          },
        ]}>
        <LinearGradient
          colors={[...coreColors]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.core}>
          {/* Icon SVG */}
          <Svg
            width={43}
            height={43}
            viewBox="0 0 24 24"
            fill="none">
            <Path
              d={iconPath}
              stroke="#ffffff"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  ring2: {
    position: 'absolute',
    borderWidth: 1.4,
  },
  coreWrapper: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 17,
    elevation: 12,
  },
  core: {
    width: '100%',
    height: '100%',
    borderRadius: CORE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
