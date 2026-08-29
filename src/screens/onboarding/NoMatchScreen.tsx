/**
 * NoMatchScreen  (F21)
 *
 * "Nobody matches yet" empty state. Shown when there are no profiles in the
 * user's city yet — honest messaging with a family-count card and two CTAs.
 *
 *   ┌─────────────────────────────────┐
 *   │  Being straight with you (pill) │
 *   │  Nobody in [city] matches you   │
 *   │  yet                            │
 *   │  We would rather say so…        │
 *   │                                 │
 *   │  ┌─── dark gradient card ─────┐ │
 *   │  │  40                        │ │
 *   │  │  families in [city] so far │ │
 *   │  └────────────────────────────┘ │
 *   │                                 │
 *   │  ┌─── white card ─────────────┐ │
 *   │  │  You have not been charged │ │
 *   │  │  Finish your biodata…      │ │
 *   │  └────────────────────────────┘ │
 *   ├─────────────────────────────────┤
 *   │  [Finish my biodata]            │
 *   │  [Search nearby cities too]     │
 *   └─────────────────────────────────┘
 *
 * Animations:
 *   - kicker + heading + sub: rise + fade at d1 (70 ms)
 *   - count card:              rise + fade at d2 (150 ms)
 *   - white card:              rise + fade at d3 (230 ms)
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
interface NoMatchScreenProps {
  city?: string;          // e.g. "Multan"
  familyCount?: number;   // e.g. 40
  onFinishBiodata?: () => void;
  onSearchNearby?: () => void;
}

// ─── component ────────────────────────────────────────────────────────────────
export function NoMatchScreen({
  city = 'your city',
  familyCount = 40,
  onFinishBiodata,
  onSearchNearby,
}: NoMatchScreenProps) {
  const insets = useSafeAreaInsets();

  const header    = useFadeRise(70);
  const countCard = useFadeRise(150);
  const whiteCard = useFadeRise(230);

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
      makeRise(whiteCard),
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

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Kicker + heading + sub — d1 */}
          <Animated.View style={[styles.qSection, riseStyle(header.anim)]}>
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>Being straight with you</Text>
            </View>
            <Text style={styles.heading}>Nobody in {city} matches you yet</Text>
            <Text style={styles.subtitle}>
              We would rather say so than show profiles that are not really
              there.
            </Text>
          </Animated.View>

          {/* Dark gradient count card — d2 */}
          <Animated.View style={riseStyle(countCard.anim)}>
            <LinearGradient
              colors={[...GradientColors.vertDark]}
              locations={[0, 0.6, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.4, y: 1 }}
              style={styles.countCard}>
              <Text style={styles.countNumber}>{familyCount}</Text>
              <Text style={styles.countLabel}>families in {city} so far</Text>
            </LinearGradient>
          </Animated.View>

          {/* White reassurance card — d3 */}
          <Animated.View style={[styles.whiteCard, riseStyle(whiteCard.anim)]}>
            <Text style={styles.whiteCardHeading}>
              You have not been charged
            </Text>
            <Text style={styles.whiteCardBody}>
              Finish your biodata and we will message you the day someone
              suitable joins.
            </Text>
          </Animated.View>
        </View>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton
            label="Finish my biodata"
            onPress={onFinishBiodata}
          />
          <GradientButton
            label="Search nearby cities too"
            variant="outline"
            onPress={onSearchNearby}
            style={styles.outlineGap}
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

  // ── Scrollable body ──
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

  // ── White reassurance card ──
  whiteCard: {
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
  whiteCardHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: Colors.ink,
    marginBottom: 6,
  },
  whiteCardBody: {
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 20,
  },

  // ── Footer ──
  footer: {
    paddingTop: 12,
    flexShrink: 0,
  },
  outlineGap: {
    marginTop: 9,
  },
});
