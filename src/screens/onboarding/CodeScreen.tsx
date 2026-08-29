/**
 * CodeScreen  (F4)
 *
 * OTP verification screen. Auto-advances focus between digit boxes,
 * counts down the resend timer, and shows an auto-read SMS banner.
 * Mirrors the HTML prototype screen F4 (and F19 error state) exactly.
 *
 *   ┌────────────────────────────────────────┐
 *   │ ◀  ▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← navbar, 12% progress
 *   │                                         │
 *   │  STEP 1 OF 5  (chip)                   │
 *   │  Enter the code                         │
 *   │  Sent to +92 300 4417 206.  Change      │
 *   │                                         │
 *   │  [4] [1] [8] [2̲] [_] [_]              │
 *   │  Resend in 0:24                         │
 *   │                                         │
 *   │  🛡 Read automatically                  │  ← mint banner
 *   │     On most phones you will not type…   │
 *   │                                         │
 *   ├────────────────────────────────────────┤
 *   │  [Continue / Verifying…]                │
 *   └────────────────────────────────────────┘
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { verifyOtp, resendOtp } from '../../api/auth';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';

// ─── constants ────────────────────────────────────────────────────────────────
const CODE_LENGTH = 6;
const PROGRESS_PERCENT = 12; // 12% for step 1/5
const RESEND_SECONDS = 24; // initial countdown
const RISE_DURATION = 550;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);
const RISE_OFFSET = 15;

// ─── helpers ──────────────────────────────────────────────────────────────────
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

// ─── small icons ──────────────────────────────────────────────────────────────
function ChevronLeft() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="15 18 9 12 15 6"
        stroke={Colors.vioInk}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L4 6v6c0 5.523 3.582 10.423 8 12 4.418-1.577 8-6.477 8-12V6l-8-4z"
        stroke={Colors.mintInk}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function AlertIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        stroke={Colors.roseInk}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M12 9v4M12 17h.01"
        stroke={Colors.roseInk}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
interface CodeScreenProps {
  /** Phone number shown in the subtitle */
  phoneNumber?: string;
  /** Email address entered on PhoneScreen */
  email?: string;
  /** Called when the user taps the back button */
  onBack?: () => void;
  /** Called when the user taps "Change" next to the phone number */
  onChangeNumber?: () => void;
  /** Called when all 6 digits are entered and user taps Continue */
  onVerify?: (code: string) => void;
  /** Pass true to render the F19 (wrong code) error state */
  hasError?: boolean;
  /** Number of attempts remaining shown in the error message */
  attemptsLeft?: number;
  /** DEV ONLY — skip OTP verification entirely */
  onSkip?: () => void;
}

export function CodeScreen({
  phoneNumber = '+92 300 4417 206',
  email,
  onBack,
  onChangeNumber,
  onVerify,
  hasError = false,
  attemptsLeft = 2,
  onSkip,
}: CodeScreenProps) {
  const insets = useSafeAreaInsets();

  // ── OTP state ──────────────────────────────────────────────────────────────
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const isComplete = digits.every(d => d !== '');

  // ── Countdown timer ────────────────────────────────────────────────────────
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const timerLabel = canResend
    ? 'Resend code'
    : `Resend in 0:${String(secondsLeft).padStart(2, '0')}`;

  // ── Entrance animations (.an.d1 / .d2 / .d3) ──────────────────────────────
  const aQ = useFadeRise(70);   // question block
  const aOtp = useFadeRise(150); // OTP row
  const aBot = useFadeRise(230); // hint + banner

  useEffect(() => {
    const make = ({ anim, delay }: ReturnType<typeof useFadeRise>) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });
    Animated.parallel([make(aQ), make(aOtp), make(aBot)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── OTP interaction ────────────────────────────────────────────────────────
  function handleChange(text: string, idx: number) {
    const char = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);

    if (char && idx < CODE_LENGTH - 1) {
      // Digit entered → advance to next box
      inputRefs.current[idx + 1]?.focus();
    } else if (!char && idx > 0) {
      // Digit erased → step back so the next backspace clears the previous box
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handleKeyPress(key: string, idx: number) {
    // Fallback for Android: if box is already empty, clear the previous one
    if (key === 'Backspace' && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = '';
      setDigits(next);
      inputRefs.current[idx - 1]?.focus();
    }
  }

  const [apiError, setApiError] = useState<string | null>(null);

  async function handleVerify() {
    if (!isComplete || verifying) return;
    setVerifying(true);
    setApiError(null);
    // Extract E.164 phone from prop (e.g. "+92 300 4417 206" → "+923004417206")
    const e164 = phoneNumber.replace(/\s/g, '');
    try {
      await verifyOtp(e164, digits.join(''));
      onVerify?.(digits.join(''));
    } catch (err: any) {
      setApiError(err?.message ?? 'Invalid code. Please try again.');
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!canResend) return;
    setCanResend(false);
    setSecondsLeft(RESEND_SECONDS);
    setDigits(Array(CODE_LENGTH).fill(''));
    setApiError(null);
    inputRefs.current[0]?.focus();
    const e164 = phoneNumber.replace(/\s/g, '');
    try {
      await resendOtp(e164);
    } catch {
      // silently fail — the user can tap resend again when timer expires
    }
  }

  // ── derived button state ───────────────────────────────────────────────────
  const hasAnyError = hasError || !!apiError;
  const buttonVariant = !isComplete || hasAnyError ? 'disabled' : 'primary';
  const buttonLabel = verifying ? 'Verifying…' : 'Continue';

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

        {/* ── Navbar ─────────────────────────────────────────────────────── */}
        <View style={styles.navbar}>
          {/* Back button */}
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backBtn,
              { transform: [{ scale: pressed ? 0.92 : 1 }] },
            ]}>
            <ChevronLeft />
          </Pressable>

          {/* Progress bar */}
          <View style={styles.prgTrack}>
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.prgFill, { width: `${PROGRESS_PERCENT}%` }]}
            />
          </View>
        </View>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Question block — .q / .qk / .qh / .qs */}
          <Animated.View style={[styles.q, riseStyle(aQ.anim)]}>
            <View style={styles.qkWrap}>
              <Text style={styles.qk}>Step 1 of 5</Text>
            </View>
            <Text style={styles.qh}>Verify your phone</Text>
            <Text style={styles.qs}>
              {'Code sent to '}
              <Text style={styles.qsPhone}>{phoneNumber}.</Text>
              {'  '}
              <Text style={styles.qsChange} onPress={onChangeNumber}>
                Change
              </Text>
            </Text>
            {!!email && (
              <View style={styles.emailRow}>
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                    stroke={Colors.ink3}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M22 6l-10 7L2 6"
                    stroke={Colors.ink3}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.emailText}>{email} saved</Text>
              </View>
            )}
          </Animated.View>

          {/* OTP boxes + error message — .otp / .ob / .ob.f / .ob.e */}
          <Animated.View style={riseStyle(aOtp.anim)}>
            <View style={styles.otp}>
              {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                const isFocused = focusedIdx === i;
                const isError = hasError;
                return (
                  <TextInput
                    key={i}
                    ref={r => { inputRefs.current[i] = r; }}
                    style={[
                      styles.ob,
                      isFocused && styles.obFocused,
                      isError && styles.obError,
                    ]}
                    value={digits[i]}
                    onChangeText={text => handleChange(text, i)}
                    onKeyPress={({ nativeEvent }) =>
                      handleKeyPress(nativeEvent.key, i)
                    }
                    onFocus={() => setFocusedIdx(i)}
                    onBlur={() => setFocusedIdx(null)}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                    selectTextOnFocus
                    caretHidden
                  />
                );
              })}
            </View>

            {/* Error message — .ferr (F19 state or API error) */}
            {(hasError || apiError) && (
              <View style={styles.ferr}>
                <AlertIcon />
                <Text style={styles.ferrText}>
                  {apiError ?? `That code was not right. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} left.`}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Hint + mint banner */}
          <Animated.View style={riseStyle(aBot.anim)}>
            {/* Resend countdown / link — .fhint */}
            <Pressable
              onPress={handleResend}
              disabled={!canResend}
              style={styles.hintWrap}>
              <Text style={[styles.fhint, canResend && styles.fhintLink]}>
                {timerLabel}
              </Text>
            </Pressable>

            {/* Mint banner — .bn-mint (linear-gradient(140deg, #E9FBF3, #DFF6EC)) */}
            <LinearGradient
              colors={['#E9FBF3', '#DFF6EC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bnMint}>
              <ShieldIcon />
              <View style={styles.bnBody}>
                <Text style={styles.bnTitle}>Read automatically</Text>
                <Text style={styles.bnText}>
                  On most phones you will not type anything.
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton
            label={buttonLabel}
            variant={buttonVariant}
            onPress={handleVerify}
            loading={verifying}
          />
          {onSkip && (
            <Pressable onPress={onSkip} style={styles.skipBtn}>
              <Text style={styles.skipLabel}>⚡ Skip (dev only)</Text>
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

  // ── Navbar (.nb) ──────────────────────────────────────────────────────────
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
    flexShrink: 0,
  },

  // .back — 38×38 rounded square, translucent white, subtle shadow
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },

  // .prg — track
  prgTrack: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },

  // .prg i — gradient fill
  prgFill: {
    height: '100%',
    borderRadius: 5,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    flexDirection: 'column',
  },

  // .q — question block padding
  q: {
    paddingTop: 18,
    paddingHorizontal: 2,
    paddingBottom: 2,
    flexShrink: 0,
  },

  // .qk chip wrapper
  qkWrap: {
    flexDirection: 'row',
    marginBottom: 10,
  },

  // .qk — uppercase pill label
  qk: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.vioInk,
    backgroundColor: Colors.vioSoft,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 9,
  },

  // .qh — heading
  qh: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    color: Colors.ink,
  },

  // .qs — subtitle
  qs: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 8,
    lineHeight: 20,
  },

  qsPhone: {
    color: Colors.ink2,
    fontWeight: '600',
  },

  // "Change" tappable link in subtitle
  qsChange: {
    color: Colors.vioD,
    fontWeight: '800',
  },

  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  emailText: {
    fontSize: 12,
    color: Colors.ink3,
    fontWeight: '500',
  },

  // ── OTP (.otp) ────────────────────────────────────────────────────────────
  otp: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  // .ob — single digit box
  ob: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    textAlign: 'center',
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  // .ob.f — focused state
  obFocused: {
    borderColor: Colors.vio,
    shadowColor: Colors.vio,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },

  // .ob.e — error state
  obError: {
    borderColor: Colors.roseD,
    backgroundColor: '#FFF4F8',
  },

  // .ferr — error message row
  ferr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },

  ferrText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.roseInk,
  },

  // ── Hint / resend (.fhint) ────────────────────────────────────────────────
  hintWrap: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },

  fhint: {
    fontSize: 11.5,
    color: Colors.ink3,
    lineHeight: 17,
  },

  fhintLink: {
    color: Colors.vioD,
    fontWeight: '700',
  },

  // ── Mint banner (.bn-mint) ────────────────────────────────────────────────
  bnMint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 12,
  },

  bnBody: {
    flex: 1,
    flexShrink: 1,
  },

  bnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.mintInk,
    marginBottom: 2,
  },

  bnText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#2A7A5E',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    paddingTop: 12,
    flexShrink: 0,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  skipLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#999',
  },
});
