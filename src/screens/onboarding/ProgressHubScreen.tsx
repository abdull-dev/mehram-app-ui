/**
 * ProgressHubScreen  (F10)
 *
 * Resumable checkpoint screen showing onboarding section completion status.
 * Mirrors the HTML prototype screen F10 exactly:
 *
 *   ┌──────────────────────────────────────┐
 *   │ ←  [▓▓▓▓▓▓▓░░░░░░░  52%]    Save   │
 *   ├──────────────────────────────────────┤
 *   │  Almost there                        │
 *   │  Three sections left. Each takes     │
 *   │  about a minute.                     │
 *   │                                      │
 *   │  ✓  The basics              Done     │
 *   │  1  Education and work  4 questions  │ ← gradient + mint glow
 *   │  2  Family and home          1 min   │
 *   │  3  In your words            2 min   │
 *   ├──────────────────────────────────────┤
 *   │  [Continue]                          │
 *   └──────────────────────────────────────┘
 *
 * Entrance: heading rises at d1 (70 ms), section list at d2 (150 ms).
 * Current-section badge has a mint glow pulse — @keyframes glow 2.4 s.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { OnboardingExit } from '../../components/ui/OnboardingExit';
import { Colors, GradientColors } from '../../theme/colors';

// ── animation helpers ─────────────────────────────────────────────────────────
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

// ── section data ──────────────────────────────────────────────────────────────
type SectionState = 'done' | 'current' | 'waiting';

interface Section {
  state: SectionState;
  num?: number;
  title: string;
  subtitle: string;
  time?: string;
}

const SECTIONS: Section[] = [
  { state: 'done', title: 'The basics', subtitle: 'Done' },
  {
    state: 'current',
    num: 1,
    title: 'Education and work',
    subtitle: '4 questions',
    time: '1 min',
  },
  {
    state: 'waiting',
    num: 2,
    title: 'Family and home',
    subtitle: 'Families ask about this first',
    time: '1 min',
  },
  {
    state: 'waiting',
    num: 3,
    title: 'In your words',
    subtitle: 'Three short answers',
    time: '2 min',
  },
];

// ── props ─────────────────────────────────────────────────────────────────────
interface ProgressHubScreenProps {
  onBack?: () => void;
  /**
   * How to leave the flow — an ✕ back to Home when this screen was opened from
   * there, or "Log out" while walking the signup. Exactly one is set.
   */
  onClose?: () => void;
  onLogout?: () => void;
  onSave?: () => void;
  onContinue?: () => void;
  continueLoading?: boolean;
}

// ── component ─────────────────────────────────────────────────────────────────
export function ProgressHubScreen({
  onBack,
  onClose,
  onLogout,
  onSave,
  onContinue,
  continueLoading,
}: ProgressHubScreenProps) {
  const insets = useSafeAreaInsets();

  // Entrance animations — .an.d1 and .an.d2
  const heading = useFadeRise(70);
  const list = useFadeRise(150);

  // Glow animation for current badge — mirrors @keyframes glow 2.4s ease-in-out infinite
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeRise = ({ anim, delay }: ReturnType<typeof useFadeRise>) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });

    Animated.parallel([makeRise(heading), makeRise(list)]).start();

    // Mint glow pulse — cannot use native driver for shadow props
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });
  const glowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

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

        {/* ── Navigation bar (.nb) ──────────────────────────────────────── */}
        <View style={styles.nb}>
          {/* Back button (.back) */}
          {/* Omitted when there is nothing behind this screen: entering the
              flow straight from Home makes this its first step. */}
          {!!onBack && !onClose && !onLogout && (
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}>
              <Svg
                width={17}
                height={17}
                viewBox="0 0 24 24"
                fill="none"
                stroke={Colors.vioInk}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </Pressable>
          )}

          {/* Progress bar (.prg) — 52% fill */}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.progressFill}
            />
          </View>

          {/* The exit when there is one, otherwise the Save link. */}
          {onClose || onLogout ? (
            <OnboardingExit onClose={onClose} onLogout={onLogout} />
          ) : (
            <Pressable
              onPress={onSave}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Text style={styles.skipText}>Save</Text>
            </Pressable>
          )}
        </View>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}>

          {/* Heading block (.q) — d1 (70 ms) */}
          <Animated.View style={[styles.questionBlock, riseStyle(heading.anim)]}
            needsOffscreenAlphaCompositing>
            <Text style={styles.heading}>Almost there</Text>
            <Text style={styles.subheading}>
              Three sections left. Each takes about a minute.
            </Text>
          </Animated.View>

          {/* Section list — d2 (150 ms) */}
          <Animated.View style={[styles.sectionList, riseStyle(list.anim)]}
            needsOffscreenAlphaCompositing>
            {SECTIONS.map((section, index) => (
              <SectionRow
                key={index}
                section={section}
                glowOpacity={glowOpacity}
                glowRadius={glowRadius}
              />
            ))}
          </Animated.View>
        </ScrollView>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton label="Continue" onPress={onContinue} loading={continueLoading} />
        </View>
      </View>
    </View>
  );
}

// ── SectionRow ────────────────────────────────────────────────────────────────

interface SectionRowProps {
  section: Section;
  glowOpacity: Animated.AnimatedInterpolation<number>;
  glowRadius: Animated.AnimatedInterpolation<number>;
}

function SectionRow({ section, glowOpacity, glowRadius }: SectionRowProps) {
  const { state, num, title, subtitle, time } = section;

  const renderBadge = () => {
    if (state === 'done') {
      // .stn.d — green gradient + checkmark
      return (
        <LinearGradient
          colors={['#4FD8A6', '#22A87C']}
          start={{ x: 0.25, y: 0 }}
          end={{ x: 0.75, y: 1 }}
          style={styles.badge}>
          <Svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round">
            <Path d="M5 12.5l5 5 9-10" />
          </Svg>
        </LinearGradient>
      );
    }

    if (state === 'current') {
      // .stn.n — primary gradient + mint glow pulse
      return (
        <Animated.View
          style={[
            styles.badgeGlowWrap,
            { shadowOpacity: glowOpacity, shadowRadius: glowRadius },
          ]}>
          <LinearGradient
            colors={[...GradientColors.primary]}
            locations={[...GradientColors.primaryLocations]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.badge}>
            <Text style={styles.badgeNumCurrent}>{num}</Text>
          </LinearGradient>
        </Animated.View>
      );
    }

    // .stn.w — soft violet bg, muted number
    return (
      <View style={[styles.badge, styles.badgeWaiting]}>
        <Text style={styles.badgeNumWaiting}>{num}</Text>
      </View>
    );
  };

  return (
    <View style={styles.row}>
      {renderBadge()}
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {time ? <Text style={styles.rowTime}>{time}</Text> : null}
    </View>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
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

  // ── nav bar (.nb) ───────────────────────────────────────────────────────────
  nb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
    flexShrink: 0,
  },

  // .back — 38×38, white translucent, rounded, shadow
  // Holds the back button's place in the row when there is nothing behind this
  // screen. Dimensions only: reusing `backBtn` left its chip and shadow behind
  // as an empty white square where the button used to be.
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  // .prg — flex track with rounded fill
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },

  // .prg i width:52%
  progressFill: {
    width: '52%',
    height: '100%',
    borderRadius: 5,
  },

  // .skip
  skipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioD,
  },

  // ── body ────────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
  },

  bodyContent: {
    paddingBottom: 8,
  },

  // ── question block (.q) — padding-top:20px for F10 ─────────────────────────
  questionBlock: {
    paddingTop: 20,
    flexShrink: 0,
  },

  // .qh — 24px 800
  heading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    color: Colors.ink,
  },

  // .qs — 13px ink-2, margin-top:8px, line-height:1.55
  subheading: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 8,
    lineHeight: 20,
  },

  // ── section list ─────────────────────────────────────────────────────────────
  sectionList: {
    marginTop: 12,
  },

  // .st — status row
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 19,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 9,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },

  // .stn — badge base (33×33, border-radius:12)
  badge: {
    width: 33,
    height: 33,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Wrapper for the current badge — carries the animated mint glow shadow
  badgeGlowWrap: {
    width: 33,
    height: 33,
    borderRadius: 12,
    flexShrink: 0,
    shadowColor: '#3FCF9A', // mint
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },

  // .stn.w — soft violet waiting state
  badgeWaiting: {
    backgroundColor: Colors.vioSoft,
  },

  // Numbers in badges
  badgeNumCurrent: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#fff',
  },

  badgeNumWaiting: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.ink3,
  },

  // Row inner content (flex:1)
  rowContent: {
    flex: 1,
  },

  // .stt — 13.5px 700
  rowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink,
  },

  // .sts — 11.5px ink-3, margin-top:1, line-height:1.4
  rowSubtitle: {
    fontSize: 11.5,
    color: Colors.ink3,
    marginTop: 1,
    lineHeight: 16,
  },

  // .stm — 11px 800 vio-d
  rowTime: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.vioD,
    flexShrink: 0,
  },

  // ── footer ──────────────────────────────────────────────────────────────────
  footer: {
    paddingTop: 12,
  },
});
