/**
 * DoneScreen  (F18)
 *
 * Onboarding complete. Layout mirrors the HTML prototype's .welc centred layout:
 *
 *   ┌─────────────────────────────────┐
 *   │  [green celebration circle ✓]   │
 *   │                                 │
 *   │  You are all set                │
 *   │                                 │
 *   │  Your first introduction…       │
 *   │                                 │
 *   │  ┌── While you wait ──────────┐ │
 *   │  │ Imran has not accepted…    │ │
 *   │  └────────────────────────────┘ │
 *   ├─────────────────────────────────┤
 *   │  [Remind Imran]                 │
 *   │  [Go to Home]                   │
 *   └─────────────────────────────────┘
 *
 * Animations:
 *   - Circle: pop (scale 0.68 → 1.07 → 1, opacity 0 → 1, 0.55 s)
 *   - Checkmark: stroke-dashoffset draw 34 → 0 (0.5 s, 0.4 s delay)
 *   - Title / body / card: rise + fade (d1 70 ms / d2 150 ms / d3 230 ms)
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors } from '../../theme/colors';

// ─── animated SVG path (useNativeDriver must be false for SVG props) ──────────
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── shared rise constants (same as WelcomeScreen) ───────────────────────────
const RISE_DURATION = 550;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);
const RISE_OFFSET = 15;

function riseStyle(anim: Animated.Value) {
  return {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [RISE_OFFSET, 0],
        }),
      },
    ],
  };
}

// ─── component ────────────────────────────────────────────────────────────────
interface DoneScreenProps {
  /** Wali's first name — shown in the nudge card and remind button */
  waliName?: string;
  onRemindWali?: () => void;
  onGoHome?: () => void;
}

export function DoneScreen({
  waliName,
  onRemindWali,
  onGoHome,
}: DoneScreenProps) {
  const insets = useSafeAreaInsets();

  // Pop: 0 → 1 over 550 ms; scale interpolated as 0.68 → 1.07 → 1
  const pop = useRef(new Animated.Value(0)).current;
  // Draw: stroke-dashoffset 34 → 0
  const draw = useRef(new Animated.Value(34)).current;
  // Rise/fade for title (d1) and body (d2)
  const titleAnim = useRef(new Animated.Value(0)).current;
  const bodyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Circle pop — cubic-bezier(0.2, 0.8, 0.3, 1) matches .cel animation
    Animated.timing(pop, {
      toValue: 1,
      duration: 550,
      easing: Easing.bezier(0.2, 0.8, 0.3, 1),
      useNativeDriver: true,
    }).start();

    // Checkmark draw — stroke-dashoffset, cannot use native driver
    Animated.timing(draw, {
      toValue: 0,
      duration: 500,
      delay: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Content rise/fade
    const makeRise = (anim: Animated.Value, delay: number) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });

    Animated.parallel([
      makeRise(titleAnim, 70),
      makeRise(bodyAnim, 150),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const popScale = pop.interpolate({
    inputRange: [0, 0.62, 1],
    outputRange: [0.68, 1.07, 1],
  });
  const popOpacity = pop.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 1],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />

      <ScrollView
        contentContainerStyle={[
          styles.screen,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 32),
          },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ── Centred content block ─────────────────────────────────────── */}
        <View style={styles.welc}>

          {/* Celebration circle — pop animation + gradient + checkmark */}
          <Animated.View
            style={[
              styles.celShadow,
              { opacity: popOpacity, transform: [{ scale: popScale }] },
            ]}>
            <LinearGradient
              colors={['#F2789F', '#C77BE0', '#A78BFA']}
              locations={[0, 0.52, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cel}>
              <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
                <AnimatedPath
                  d="M5 12.5l5 5 9-10"
                  stroke="#fff"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={34}
                  strokeDashoffset={draw}
                />
              </Svg>
            </LinearGradient>
          </Animated.View>

          {/* "You are all set" — d1 */}
          <Animated.Text style={[styles.title, riseStyle(titleAnim)]}>
            You are all set
          </Animated.Text>

          {/* Body paragraph — d2 */}
          <Animated.Text style={[styles.body, riseStyle(bodyAnim)]}>
            Your first introduction arrives tomorrow morning. We will let you
            know.
          </Animated.Text>

        </View>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton
            label="Go to Home"
            onPress={onGoHome}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.page,
    overflow: 'hidden',
  },
  screen: {
    flexGrow: 1,
    paddingHorizontal: 16,
    flexDirection: 'column',
  },
  // .welc — centred column, full height
  welc: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  // Outer wrapper carries the shadow (can't shadow a LinearGradient directly)
  celShadow: {
    borderRadius: 44,
    marginBottom: 18,
    shadowColor: '#9B7BF0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 13,
    elevation: 10,
  },
  // Inner gradient fill — .cel
  cel: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // .wh
  title: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 31, // 27 × 1.16 ≈ 31
    textAlign: 'center',
    color: Colors.ink,
  },
  // .wp
  body: {
    fontSize: 14,
    color: Colors.ink2,
    marginTop: 13,
    lineHeight: 23, // 14 × 1.62 ≈ 23
    textAlign: 'center',
  },

  // .foot
  footer: {
    paddingTop: 16,
  },
});
