/**
 * VerificationScreen  (F16)
 *
 * Verification step — both face scan and CNIC/passport are optional.
 *
 *   ┌─────────────────────────────────┐
 *   │  ← [=========95%==============] │  NavBar
 *   ├─────────────────────────────────┤
 *   │  Verification (pill)            │
 *   │  Nearly done                    │
 *   │                                 │
 *   │  ✓ Phone number    – Verified   │
 *   │  2 A scan of face    Optional   │  [Optional]
 *   │  3 CNIC or passport  Optional   │  [Optional]
 *   │                                 │
 *   │  [gold] Adding ID earns badge   │
 *   │  [mint] Documents never shown   │
 *   ├─────────────────────────────────┤
 *   │  [Scan my face] / [Continue]    │
 *   │  Skip for now                   │
 *   └─────────────────────────────────┘
 *
 * Entrance: question at d1 (70 ms), step list at d2 (150 ms), banners at d3/d4.
 * faceDone / cnicDone are controlled by the parent — this screen is pure UI.
 */

import React, { useEffect, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { VerificationBlock } from '../../components/verification/VerificationBlock';
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

// ─── icons ────────────────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 13l4 4L19 7"
        stroke="#fff"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BackIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={Colors.vioInk}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={11} rx={2} ry={2} stroke={color} strokeWidth={2} />
      <Path
        d="M7 11V7a5 5 0 0110 0v4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

/** Single step row (.st) */
interface StepRowProps {
  state: 'done' | 'optional';
  number: number;
  title: string;
  subtitle: string;
  showOptionalBadge?: boolean;
  onPress?: () => void;
}

function StepRow({ state, number, title, subtitle, showOptionalBadge, onPress }: StepRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.step,
        pressed && onPress ? { opacity: 0.85 } : undefined,
      ]}>
      {/* Step node (.stn) */}
      {state === 'done' ? (
        <LinearGradient
          colors={['#4FD8A6', '#22A87C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.stepNodeDone}>
          <CheckIcon />
        </LinearGradient>
      ) : (
        <View style={styles.stepNodeOptional}>
          <Text style={styles.stepNodeText}>{number}</Text>
        </View>
      )}

      {/* Text block */}
      <View style={styles.stepBody}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepSubtitle}>{subtitle}</Text>
      </View>

      {/* Optional badge (.stm) */}
      {showOptionalBadge && state !== 'done' && (
        <Text style={styles.stepBadge}>Optional</Text>
      )}
    </Pressable>
  );
}

/** Info banner (.bn) */
interface BannerProps {
  tone: 'gold' | 'mint';
  icon: 'shield' | 'lock';
  title: string;
  body: string;
}

function Banner({ tone, icon, title, body }: BannerProps) {
  const gradColors: [string, string] =
    tone === 'gold' ? ['#FDF5E6', '#FBEFD8'] : ['#E9FBF3', '#DFF6EC'];
  const iconColor = tone === 'gold' ? Colors.goldInk : Colors.mintInk;
  const titleColor = tone === 'gold' ? Colors.goldInk : Colors.mintInk;
  const bodyColor = tone === 'gold' ? '#8A6410' : '#2A7A5E';

  return (
    <LinearGradient
      colors={gradColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.banner}>
      <View style={styles.bannerIcon}>
        {icon === 'shield' ? <ShieldIcon color={iconColor} /> : <LockIcon color={iconColor} />}
      </View>
      <View style={styles.bannerText}>
        <Text style={[styles.bannerTitle, { color: titleColor }]}>{title}</Text>
        <Text style={[styles.bannerBody, { color: bodyColor }]}>{body}</Text>
      </View>
    </LinearGradient>
  );
}

// ─── screen ───────────────────────────────────────────────────────────────────
interface VerificationScreenProps {
  /** Whether the face scan has been completed */
  faceDone?: boolean;
  /** Whether CNIC / passport has been added */
  cnicDone?: boolean;
  /** Face scan explicitly failed — shows H3 VerificationBlock */
  faceFailed?: boolean;
  /** CNIC verification explicitly failed — shows H4 VerificationBlock (only when !faceFailed) */
  cnicFailed?: boolean;
  /** Remaining face scan attempts (shown in H3 banner) */
  faceAttemptsLeft?: number;
  /** Back chevron */
  onBack?: () => void;
  /** Tap "Scan my face" */
  onScanFace?: () => void;
  /** Tap the CNIC step row */
  onAddId?: () => void;
  /** Tap "Continue" or "Skip for now" */
  onContinue?: () => void;
  /** Tap "Try again" in H3 */
  onRetryFace?: () => void;
  /** Tap "Upload document" in H4 */
  onUploadCnic?: () => void;
  /** Back pressed while in failed state — dismisses the block, returns to normal F16 */
  onDismissFailed?: () => void;
}

export function VerificationScreen({
  faceDone = false,
  cnicDone = false,
  faceFailed = false,
  cnicFailed = false,
  faceAttemptsLeft = 2,
  onBack,
  onScanFace,
  onAddId,
  onContinue,
  onRetryFace,
  onUploadCnic,
  onDismissFailed,
}: VerificationScreenProps) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  // Staggered entrance animations: d1 → d2 → d3 → d4
  const question = useFadeRise(70);
  const steps = useFadeRise(150);
  const bannerGold = useFadeRise(230);
  const bannerMint = useFadeRise(310);

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
      makeRise(question),
      makeRise(steps),
      makeRise(bannerGold),
      makeRise(bannerMint),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── H3: face scan failed ────────────────────────────────────────────────────
  if (faceFailed) {
    return (
      <VerificationBlock
        variant="face"
        attemptsLeft={faceAttemptsLeft}
        // Submission belongs to the parent handler, which owns the done/failed
        // state. Calling the API here too submitted twice per tap.
        onAction={onRetryFace}
        onBack={onDismissFailed ?? onBack}
      />
    );
  }

  // ── H4: CNIC failed (face already resolved) ─────────────────────────────────
  if (cnicFailed) {
    return (
      <VerificationBlock
        variant="cnic"
        onAction={onUploadCnic}
        onBack={onDismissFailed ?? onBack}
      />
    );
  }

  // Primary CTA: "Scan my face" until face is done, then "Continue"
  // Three steps, so three primary actions — the middle one was missing. With
  // the face done but no ID, the primary said "Continue" and exited, while the
  // *secondary* link labelled "Add ID later" was the thing that actually
  // submitted the ID. The two were swapped: the button that finishes
  // verification is the primary one, and leaving is the text link.
  const primaryLabel = !faceDone
    ? 'Scan my face'
    : !cnicDone
      ? 'Add CNIC or passport'
      : 'Continue';
  // The submit was awaited with no loading state, so the button sat inert for
  // the length of the request and the press read as ignored.
  // Submission itself lives in the parent handlers, which own the done/failed
  // state. This screen used to call submitFaceVerification() here as well, so
  // once the parent was wired to the real API the face was submitted twice on
  // every tap.
  const primaryStep = !faceDone ? onScanFace : !cnicDone ? onAddId : onContinue;

  // The parent handlers are async, so the spinner tracks the real request
  // rather than a local one this screen no longer makes.
  const primaryAction = async () => {
    if (submitting || !primaryStep) return;
    setSubmitting(true);
    try {
      await primaryStep();
    } finally {
      setSubmitting(false);
    }
  };

  // Leaving is always the text link, never the primary button.
  const secondaryLabel = !faceDone
    ? 'Skip for now'
    : !cnicDone
      ? 'Add ID later'
      : undefined;
  const secondaryAction = onContinue;

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

        {/* ── NavBar (.nb) ─────────────────────────────────────────── */}
        <View style={styles.navbar}>
          {/* Omitted when there is no handler: opened from the home screen this
              is the first screen of its own trip, and the step behind it in the
              onboarding order is one the user already finished. */}
          {onBack ? (
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.backBtnPressed,
              ]}>
              <BackIcon />
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}

          {/* Progress bar — 95% (.prg) */}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressFill}
            />
          </View>
        </View>

        {/* ── Body (.body) ─────────────────────────────────────────── */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Question section (.q .an.d1) */}
          <Animated.View style={[styles.qSection, riseStyle(question.anim)]}>
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>Verification</Text>
            </View>
            <Text style={styles.heading}>Nearly done</Text>
          </Animated.View>

          {/* Step list (.an.d2) */}
          <Animated.View style={[styles.stepList, riseStyle(steps.anim)]}>
            {/* Step 1 — phone, always verified */}
            <StepRow
              state="done"
              number={1}
              title="Phone number"
              subtitle="Verified"
            />

            {/* Step 2 — face scan, optional */}
            <StepRow
              state={faceDone ? 'done' : 'optional'}
              number={2}
              title="A scan of your face"
              subtitle={faceDone ? 'Completed' : 'Optional. Takes 30 seconds.'}
              showOptionalBadge
              onPress={faceDone ? undefined : onScanFace}
            />

            {/* Step 3 — CNIC / passport, optional */}
            <StepRow
              state={cnicDone ? 'done' : 'optional'}
              number={3}
              title="CNIC or passport"
              subtitle={cnicDone ? 'Added' : 'Optional'}
              showOptionalBadge
              onPress={cnicDone ? undefined : onAddId}
            />
          </Animated.View>

          {/* Info banner — gold (.bn.bn-gold .an.d3) */}
          <Animated.View style={riseStyle(bannerGold.anim)}>
            <Banner
              tone="gold"
              icon="shield"
              title="Adding ID earns the verified badge"
              body="Families see it on your card, and verified profiles are shown first."
            />
          </Animated.View>

          {/* Info banner — mint (.bn.bn-mint .an.d4) */}
          <Animated.View style={riseStyle(bannerMint.anim)}>
            <Banner
              tone="mint"
              icon="lock"
              title="Documents are never shown to members"
              body="Reviewed once, then deleted from our systems."
            />
          </Animated.View>
        </ScrollView>

        {/* ── Footer (.foot) ───────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton label={primaryLabel} onPress={primaryAction} loading={submitting} />

          {/* Both steps done leaves nothing to skip, so the link goes rather
              than sitting there as a second way to do what Continue does. */}
          {!!secondaryLabel && (
            <Pressable
              onPress={secondaryAction}
              style={({ pressed }) => [
                styles.textBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}>
              <Text style={styles.textBtnLabel}>{secondaryLabel}</Text>
            </Pressable>
          )}
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

  // ── NavBar (.nb) ──
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
    flexShrink: 0,
  },
  // Holds the back button's place in the row when there is nothing behind this
  // screen. Dimensions only: reusing `backBtn` left its chip and shadow behind
  // as an empty white square where the button used to be.
  backSpacer: { width: 38, height: 38, flexShrink: 0 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 12,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  backBtnPressed: {
    transform: [{ scale: 0.92 }],
  },
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '95%',
    height: '100%',
    borderRadius: 5,
  },

  // ── Body ──
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 8,
  },

  // ── Question section (.q) ──
  qSection: {
    paddingTop: 18,
    paddingHorizontal: 2,
    paddingBottom: 10,
    flexShrink: 0,
  },
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
  heading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    color: Colors.ink,
  },

  // ── Step list ──
  stepList: {
    gap: 0,
    marginBottom: 4,
  },

  // .st — individual step row
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 19,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 9,
    shadowColor: 'rgba(60,40,120,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },

  // .stn.d — done node (green gradient, applied via LinearGradient wrapper)
  stepNodeDone: {
    width: 33,
    height: 33,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // .stn.w — optional/waiting node
  stepNodeOptional: {
    width: 33,
    height: 33,
    borderRadius: 12,
    backgroundColor: Colors.vioSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNodeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.ink3,
  },

  // Step text
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink,
  },
  stepSubtitle: {
    fontSize: 11.5,
    color: Colors.ink3,
    marginTop: 1,
    lineHeight: 16,
  },

  // .stm — optional badge
  stepBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.vioD,
    flexShrink: 0,
  },

  // ── Banners (.bn) ──
  banner: {
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flexShrink: 0,
  },
  bannerIcon: {
    flexShrink: 0,
    marginTop: 1,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 11.5,
    lineHeight: 17,
  },

  // ── Footer ──
  footer: {
    paddingTop: 12,
    flexShrink: 0,
  },
  textBtn: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },
  textBtnLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink2,
    textAlign: 'center',
  },
});
