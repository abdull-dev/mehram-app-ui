/**
 * UnderReviewScreen  (H9)
 *
 * Shown when the user has paid but their profile is still under review.
 *
 *   ┌─────────────────────────────────┐
 *   │  [gold clock circle]            │
 *   │                                 │
 *   │  Under review                   │
 *   │                                 │
 *   │  Your payment was received.     │
 *   │  Our team is reviewing your     │
 *   │  profile — we'll notify you     │
 *   │  within 24 hours.               │
 *   │                                 │
 *   │  ┌── What happens next ───────┐ │
 *   │  │ Once approved, you'll      │ │
 *   │  │ receive your first…        │ │
 *   │  └────────────────────────────┘ │
 *   ├─────────────────────────────────┤
 *   │  [Got it]                       │
 *   └─────────────────────────────────┘
 *
 * Animations:
 *   - Circle: pop (scale 0.68 → 1.07 → 1, opacity 0 → 1, 0.55 s)
 *   - Title / body / card: rise + fade (d1 70 ms / d2 150 ms / d3 230 ms)
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { DailyDuaCard } from '../../components/ui/DailyDuaCard';
import { WhileYouWaitCard } from '../../components/ui/WhileYouWaitCard';
import { Colors } from '../../theme/colors';

// ─── animation helpers ────────────────────────────────────────────────────────
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

// ─── clock icon ───────────────────────────────────────────────────────────────
function ClockIcon() {
  return (
    <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={9}
        stroke="#fff"
        strokeWidth={2.2}
      />
      <Path
        d="M12 7v5l3 2"
        stroke="#fff"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
interface UnderReviewScreenProps {
  /**
   * A verification is genuinely awaiting review (the server reports PENDING).
   *
   * False means nothing has been submitted yet — `verification.status` is null.
   * Both cases reach this screen, and claiming a review is underway when none
   * exists is the one thing it must not do.
   */
  verificationPending?: boolean;
  /**
   * Some verification types are submitted but not all. Distinct from "nothing
   * submitted": the remaining step is smaller and the wording should say so.
   */
  verificationPartial?: boolean;
  /** Called when user taps "Got it" */
  onGoHome?: () => void;
  /** Take the user to the verification step when nothing has been submitted. */
  onStartVerification?: () => void;
}

export function UnderReviewScreen({
  onGoHome,
  verificationPending = true,
  verificationPartial = false,
  onStartVerification,
}: UnderReviewScreenProps) {
  const insets = useSafeAreaInsets();

  // Pop: 0 → 1 over 550 ms; scale interpolated as 0.68 → 1.07 → 1
  const pop = useRef(new Animated.Value(0)).current;
  // Rise/fade for title (d1), body (d2), and card (d3)
  const titleAnim = useRef(new Animated.Value(0)).current;
  const bodyAnim  = useRef(new Animated.Value(0)).current;
  const cardAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pop, {
      toValue: 1,
      duration: 550,
      easing: Easing.bezier(0.2, 0.8, 0.3, 1),
      useNativeDriver: true,
    }).start();

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
      makeRise(cardAnim, 230),
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
            // Kept tall with or without the footer: on the home screen this
            // scrolls behind an overlaid tab bar, so the last card still needs
            // the same clearance the button used to occupy.
            paddingBottom: Math.max(insets.bottom + 100, 120),
          },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ── Centred content block ─────────────────────────────────────── */}
        <View style={styles.welc}>

          {/* Gold clock circle — pop animation */}
          <Animated.View
            style={[
              styles.celShadow,
              { opacity: popOpacity, transform: [{ scale: popScale }] },
            ]}>
            <LinearGradient
              colors={['#F5C842', '#E0A93B', '#C47F10']}
              locations={[0, 0.52, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cel}>
              <ClockIcon />
            </LinearGradient>
          </Animated.View>

          {/* "Under review" — d1 */}
          <Animated.Text style={[styles.title, riseStyle(titleAnim)]}>
            {verificationPending
              ? 'Under review'
              : verificationPartial
                ? 'Almost there'
                : 'One step left'}
          </Animated.Text>

          {/* Body paragraph — d2 */}
          <Animated.Text style={[styles.body, riseStyle(bodyAnim)]}>
            {verificationPending
              ? 'Your payment was received. Our team is reviewing your profile — we will notify you within 24 hours.'
              : verificationPartial
                ? 'Add your CNIC or passport to finish verification, then our team will review your profile.'
                : 'Your payment was received. Verify your identity and our team will review your profile.'}
          </Animated.Text>

          {/* "What happens next" info card — d3 */}
          <Animated.View style={[styles.card, riseStyle(cardAnim)]}>
            <Text style={styles.cardLabel}>What happens next</Text>
            <Text style={styles.cardBody}>
              {verificationPending
                ? 'Once approved, you will receive your first introduction. We will send you a notification right away.'
                : 'Once you verify, review usually takes under 24 hours. Your first introduction follows approval.'}
            </Text>
          </Animated.View>

          {!verificationPending && !!onStartVerification && (
            <Animated.View style={[styles.card, riseStyle(cardAnim)]}>
              <GradientButton
                label={
                  verificationPartial
                    ? 'Finish verification'
                    : 'Verify my identity'
                }
                onPress={onStartVerification}
              />
            </Animated.View>
          )}

        </View>

        {/* ── While you wait ────────────────────────────────────────────── */}
        <WhileYouWaitCard doneCount={3} />

        {/* ── Daily Dua ─────────────────────────────────────────────────── */}
        <DailyDuaCard index={1} />

        {/* ── Footer ────────────────────────────────────────────────────── */}
        {/* Only when there is somewhere to go. On the home screen this screen
            *is* the destination, so the button was rendered with no handler —
            a dead control, and a reserved strip of space below the content. */}
        {!!onGoHome && (
          <View style={styles.footer}>
            <GradientButton label="Got it" onPress={onGoHome} />
          </View>
        )}
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
    // Separates this block from the cards that follow it. Its last child only
    // carries a top margin, so without this the "What happens next" card sat
    // flush against "While you wait".
    marginBottom: 20,
  },

  // Outer wrapper carries the shadow
  celShadow: {
    borderRadius: 44,
    marginBottom: 18,
    shadowColor: '#C47F10',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 13,
    elevation: 10,
  },
  // Inner gradient fill
  cel: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 31,
    textAlign: 'center',
    color: Colors.ink,
  },
  body: {
    fontSize: 14,
    color: Colors.ink2,
    marginTop: 13,
    lineHeight: 23,
    textAlign: 'center',
  },

  // Info card
  card: {
    marginTop: 20,
    backgroundColor: Colors.goldSoft,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
  },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.goldInk,
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 13,
    color: Colors.goldInk,
    lineHeight: 20,
  },

  // While you wait card
  waitCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    padding: 17,
    marginTop: 12,
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 2,
  },
  waitTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: Colors.ink,
    marginBottom: 4,
  },
  waitBody: {
    fontSize: 12.5,
    color: Colors.ink2,
    lineHeight: 19,
  },

  // .foot
  footer: {
    paddingTop: 16,
  },
});
