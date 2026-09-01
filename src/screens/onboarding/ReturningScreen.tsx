/**
 * ReturningScreen  (F22)
 *
 * "You were almost done" resume state. Shown when a user returns mid-onboarding
 * — reassures them progress is saved and shows exactly what is left.
 *
 *   ┌─────────────────────────────────┐
 *   │  Welcome back (pill)            │
 *   │  You were almost done           │
 *   │  Everything saved…              │
 *   │                                 │
 *   │  ┌─── dark gradient card ─────┐ │
 *   │  │  142                       │ │
 *   │  │  still match what you…     │ │
 *   │  └────────────────────────────┘ │
 *   │                                 │
 *   │  ┌─── progress rows card ─────┐ │
 *   │  │ ① Family and home   1 min  │ │
 *   │  │ ─────────────── hairline ─ │ │
 *   │  │ ② In your words     2 min  │ │
 *   │  └────────────────────────────┘ │
 *   ├─────────────────────────────────┤
 *   │  [Pick up where I left off]     │
 *   └─────────────────────────────────┘
 *
 * Animations:
 *   - heading + sub: rise + fade at d1 (70 ms)
 *   - count card:    rise + fade at d2 (150 ms)
 *   - progress rows: rise + fade at d3 (230 ms)
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';
import { GRADIENT_FILL } from '../../theme/layout';

// ─── animation helpers ────────────────────────────────────────────────────────
const RISE_DURATION = 550;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);
const RISE_OFFSET = 15;

function useFadeRise(delay: number) {
  const anim = useRef(new Animated.Value(0)).current;
  return { anim, delay };
}

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

// ─── props ────────────────────────────────────────────────────────────────────
interface ReturningScreenProps {
  onContinue?: () => void;
}

// ─── component ────────────────────────────────────────────────────────────────
export function ReturningScreen({ onContinue }: ReturningScreenProps) {
  const insets = useSafeAreaInsets();

  const header       = useFadeRise(70);
  const countCard    = useFadeRise(150);
  const progressRows = useFadeRise(230);

  useEffect(() => {
    const makeRise = ({ anim, delay }: ReturnType<typeof useFadeRise>) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });

    Animated.parallel([
      makeRise(header),
      makeRise(countCard),
      makeRise(progressRows),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />

      <View
        style={[
          styles.screen,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>

        {/* ── Body ────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Kicker + heading + sub — d1 */}
          <Animated.View style={[styles.qSection, riseStyle(header.anim)]}
            needsOffscreenAlphaCompositing>
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>Welcome back</Text>
            </View>
            <Text style={styles.heading}>You were almost done</Text>
            <Text style={styles.subtitle}>
              Everything saved. Two sections left, about three minutes.
            </Text>
          </Animated.View>

          {/* Dark gradient count card — d2 */}
          <Animated.View style={riseStyle(countCard.anim)}
            needsOffscreenAlphaCompositing>
            <View style={styles.countCard}>
              <LinearGradient
              colors={[...GradientColors.vertDark]}
              locations={[0, 0.6, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.4, y: 1 }}
              style={GRADIENT_FILL}
              pointerEvents="none"
            />
              <Text style={styles.countNumber}>142</Text>
              <Text style={styles.countLabel}>still match what you told us</Text>
            </View>
          </Animated.View>

          {/* Progress rows card — d3 */}
          <Animated.View style={[styles.progressCard, riseStyle(progressRows.anim)]}
            needsOffscreenAlphaCompositing>

            {/* Row 1 — violet badge, "Where you left off" */}
            <View style={styles.progressRow}>
              <View style={[styles.badge, styles.badgeViolet]}>
                <Text style={styles.badgeTextViolet}>1</Text>
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Family and home</Text>
                <Text style={styles.rowSub}>Where you left off</Text>
              </View>
              <Text style={styles.rowDuration}>1 min</Text>
            </View>

            {/* Hairline divider */}
            <View style={styles.hairline} />

            {/* Row 2 — light badge, "In your words" */}
            <View style={styles.progressRow}>
              <View style={[styles.badge, styles.badgeLight]}>
                <Text style={styles.badgeTextLight}>2</Text>
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>In your words</Text>
              </View>
              <Text style={styles.rowDuration}>2 min</Text>
            </View>
          </Animated.View>
        </View>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton
            label="Pick up where I left off"
            onPress={onContinue}
          />
        </View>
      </View>
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
    flex: 1,
    paddingHorizontal: 16,
    flexDirection: 'column',
  },

  // ── Body ──
  body: {
    flex: 1,
    justifyContent: 'center',
  },

  // ── Question section (.q) ──
  qSection: {
    paddingHorizontal: 2,
    paddingBottom: 2,
    flexShrink: 0,
  },
  // .qk
  kicker: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vioSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
    marginBottom: 10,
  },
  kickerText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.vioInk,
  },
  // .qh
  heading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    color: Colors.ink,
  },
  // .qs
  subtitle: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 8,
    lineHeight: 20,
  },

  // ── Dark count card ──
  countCard: {
    borderRadius: 22,
    padding: 19,
    marginTop: 12,
    alignItems: 'center',
    flexShrink: 0,
    shadowColor: '#462D96',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 15,
    shadowOpacity: 0.28,
    elevation: 12,
  },
  countNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1.2,
  },
  countLabel: {
    fontSize: 12.5,
    color: '#DCD1FB',
    marginTop: 4,
  },

  // ── Progress card ──
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    flexShrink: 0,
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },

  // Progress row
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },

  // Circle badge — shared dimensions
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeViolet: {
    backgroundColor: Colors.vio,
  },
  badgeLight: {
    backgroundColor: Colors.vioSoft,
  },
  badgeTextViolet: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  badgeTextLight: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.ink3,
  },

  // Row text content
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.1,
  },
  rowSub: {
    fontSize: 11.5,
    color: Colors.ink3,
    marginTop: 1,
  },
  rowDuration: {
    fontSize: 11,
    color: Colors.ink3,
    flexShrink: 0,
  },

  // Hairline between rows
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginVertical: 10,
    marginLeft: 44, // align under text, past the badge
  },

  // ── Footer ──
  footer: {
    paddingTop: 12,
    flexShrink: 0,
  },
});
