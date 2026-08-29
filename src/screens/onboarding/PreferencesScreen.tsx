/**
 * PreferencesScreen  (F13)
 *
 * Preferences — live count.  Matches the HTML prototype screen F13 exactly:
 *
 *   ┌─────────────────────────────────┐
 *   │  ████████████████░░░░  [Save]   │  ← 80 % progress nav
 *   │                                 │
 *   │  PREFERENCES                    │
 *   │  Who are you                    │
 *   │  hoping to meet?                │
 *   │  Narrow is fine…                │
 *   │                                 │
 *   │  ┌─ Age range ───────────────┐  │
 *   │  │  24 to 30 years           │  │
 *   │  │  ●══════════════════      │  │  min slider (18–55)
 *   │  │  ════════════●════════    │  │  max slider (18–60)
 *   │  └───────────────────────────┘  │
 *   │                                 │
 *   │  ┌─── dark gradient card ────┐  │
 *   │  │           56              │  │  ← live count (formula-driven)
 *   │  │  A healthy range…         │  │
 *   │  └───────────────────────────┘  │
 *   ├─────────────────────────────────┤
 *   │  [Continue]                     │
 *   └─────────────────────────────────┘
 *
 * Live count formula (mirrors prototype rng() function):
 *   n = max(0, round((max−min)×7.4 + (min<26 ? 14 : 0) − |28−(min+max)/2|×2.6))
 *
 * Animations:
 *   • Entrance: heading / field / live-card rise (staggered 70 / 150 / 230 ms)
 *   • Count pulse: quick scale 1→1.1→1 whenever the count changes
 *   • Sweep shimmer: 3 s looping shine across the dark card
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
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

// ─── live count formula ───────────────────────────────────────────────────────
function calcCount(minAge: number, maxAge: number): number {
  const a = minAge;
  const b = maxAge;
  return Math.max(
    0,
    Math.round(
      (b - a) * 7.4 + (a < 26 ? 14 : 0) - Math.abs(28 - (a + b) / 2) * 2.6,
    ),
  );
}

// ─── animation helpers ────────────────────────────────────────────────────────
const RISE_DURATION = 550;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);

function useRise(delay: number) {
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
          outputRange: [15, 0],
        }),
      },
    ],
  };
}

// ─── component ────────────────────────────────────────────────────────────────
interface PreferencesScreenProps {
  /** Called with narrow=true when liveCount===0; also passes the chosen ages */
  onContinue?: (data: { narrow: boolean; ageMin: number; ageMax: number }) => void;
  onSave?: () => void;
  continueLoading?: boolean;
}

export function PreferencesScreen({
  onContinue,
  onSave,
  continueLoading,
}: PreferencesScreenProps) {
  const insets = useSafeAreaInsets();

  // ── slider state ────────────────────────────────────────────────────────────
  const [minAge, setMinAge] = useState(24);
  const [maxAge, setMaxAge] = useState(30);

  const handleMinAge = (v: number) => {
    setMinAge(v);
    if (v > maxAge) { setMaxAge(v); }
  };
  const handleMaxAge = (v: number) => {
    setMaxAge(v);
    if (v < minAge) { setMinAge(v); }
  };

  // ── derived values ──────────────────────────────────────────────────────────
  const liveCount = calcCount(minAge, maxAge);
  const hint =
    liveCount < 8
      ? 'Narrow. Two more years usually adds nine profiles.'
      : 'A healthy range. Introductions will come steadily.';
  const ageLabel = `${minAge} to ${maxAge} years`;

  // ── entrance animations (.an .d1/.d2/.d3) ──────────────────────────────────
  const heading = useRise(70);
  const field = useRise(150);
  const liveCard = useRise(230);

  useEffect(() => {
    const rise = ({ anim, delay }: ReturnType<typeof useRise>) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });
    Animated.parallel([rise(heading), rise(field), rise(liveCard)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── count pulse (scale 1 → 1.1 → 1 when liveCount changes) ─────────────────
  const countScale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(liveCount);

  useEffect(() => {
    if (prevCount.current === liveCount) { return; }
    prevCount.current = liveCount;
    countScale.stopAnimation();
    Animated.sequence([
      Animated.timing(countScale, {
        toValue: 1.1,
        duration: 100,
        easing: Easing.bezier(0.2, 0.8, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(countScale, {
        toValue: 1,
        duration: 150,
        easing: Easing.bezier(0.2, 0.8, 0.3, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [liveCount, countScale]);

  // ── sweep shimmer (3 s linear loop across the dark card) ───────────────────
  const sweepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirrors CSS: background-position -220px → 420px over 3 s
  const sweepX = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 420],
  });

  // ── render ──────────────────────────────────────────────────────────────────
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

        {/* ── Progress nav bar ─────────────────────────────────────────── */}
        <View style={styles.nb}>
          <View style={styles.nbp}>
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.nbb}
            />
          </View>
          <Pressable
            onPress={onSave}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Text style={styles.nbs}>Save</Text>
          </Pressable>
        </View>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* ── Question header (.q .an) ─────────────────────────────── */}
          <Animated.View style={[styles.q, riseStyle(heading.anim)]}>
            <Text style={styles.qk}>Preferences</Text>
            <Text style={styles.qh}>Who are you{'\n'}hoping to meet?</Text>
            <Text style={styles.qs}>
              Narrow is fine. It just means fewer introductions.
            </Text>
          </Animated.View>

          {/* ── Age range field (.field .an .d2) ─────────────────────── */}
          <Animated.View style={[styles.field, riseStyle(field.anim)]}>
            <Text style={styles.flab}>Age range</Text>
            <Text style={styles.srowLabel}>{ageLabel}</Text>

            <View style={styles.stepperRow}>
              {/* Min age stepper */}
              <View style={styles.stepperCol}>
                <Text style={styles.stepperLabel}>Min</Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                    onPress={() => handleMinAge(Math.max(18, minAge - 1))}>
                    <Text style={styles.stepBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepValue}>{minAge}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                    onPress={() => handleMinAge(Math.min(55, minAge + 1))}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.stepperDivider} />

              {/* Max age stepper */}
              <View style={styles.stepperCol}>
                <Text style={styles.stepperLabel}>Max</Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                    onPress={() => handleMaxAge(Math.max(18, maxAge - 1))}>
                    <Text style={styles.stepBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepValue}>{maxAge}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                    onPress={() => handleMaxAge(Math.min(60, maxAge + 1))}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ── Live count card (.live-c .an .d3) ────────────────────── */}
          <Animated.View style={riseStyle(liveCard.anim)}>
            <LinearGradient
              colors={[...GradientColors.vertDark]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.liveCard}>

              {/* Sweep shimmer overlay (.live-c::after) */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.sweepWrap,
                  { transform: [{ translateX: sweepX }] },
                ]}>
                <LinearGradient
                  colors={[
                    'transparent',
                    'rgba(255,255,255,0.14)',
                    'transparent',
                  ]}
                  locations={[0.3, 0.46, 0.62]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.sweep}
                />
              </Animated.View>

              {/* Count number (.lcn) — pop animation on change */}
              <Animated.Text
                style={[
                  styles.lcn,
                  { transform: [{ scale: countScale }] },
                ]}>
                {liveCount}
              </Animated.Text>

              {/* Hint text (.lcl) */}
              <Text style={styles.lcl}>{hint}</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* ── Footer (.foot) ────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton
            label="Continue"
            loading={continueLoading}
            onPress={() => onContinue?.({ narrow: liveCount === 0, ageMin: minAge, ageMax: maxAge })}
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

  // ── Nav bar (.nb / .nbp / .nbb / .nbs) ──────────────────────────────────
  nb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 12,
    gap: 14,
  },
  nbp: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(155,123,240,0.18)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  nbb: {
    // 80 % progress for F13
    width: '80%',
    height: '100%',
    borderRadius: 3,
  },
  nbs: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioD,
  },

  // ── Body ─────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
  },

  // ── Question header (.q / .qk / .qh / .qs) ───────────────────────────────
  q: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  qk: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vioSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
    marginBottom: 10,
    overflow: 'hidden',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.vioInk,
  },
  qh: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    marginTop: 5,
    color: Colors.ink,
  },
  qs: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 7,
    lineHeight: 20,
  },

  // ── Field card (.field / .flab / .srow) ──────────────────────────────────
  field: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  flab: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.ink3,
  },
  srowLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.vioInk,
    marginTop: 6,
    marginBottom: 16,
  },

  // Stepper row — two columns side by side
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  stepperCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  stepperLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.ink3,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.vioSoft,
    borderRadius: 16,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPressed: {
    backgroundColor: 'rgba(155,123,240,0.18)',
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: '300',
    color: Colors.vioInk,
    lineHeight: 26,
  },
  stepValue: {
    width: 40,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: Colors.vioInk,
    letterSpacing: -0.5,
  },
  stepperDivider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(155,123,240,0.15)',
  },

  // ── Live count card (.live-c / .lcn / .lcl) ───────────────────────────────
  liveCard: {
    marginTop: 12,
    borderRadius: 24,
    padding: 17,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#46308A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 12,
  },
  // Sweep shimmer overlay — translates across the card on a loop
  sweepWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 420,
  },
  sweep: {
    flex: 1,
  },
  lcn: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1.8,
    lineHeight: 48,
    textShadowColor: 'rgba(0,0,0,0.16)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 18,
  },
  lcl: {
    fontSize: 12.5,
    color: '#DCD1FB',
    marginTop: 9,
    lineHeight: 19,
    textAlign: 'center',
  },

  // ── Footer (.foot) ────────────────────────────────────────────────────────
  footer: {
    paddingTop: 12,
  },
});
