/**
 * AccountVerificationScreen
 *
 * Shown immediately after Sign Up. Two verification rows:
 *   • Phone — tapping [Verify] sends SMS OTP, then shows 6 inline boxes
 *             → auto-verifies via verifyPhoneOnly on last digit entry
 *   • Email — tapping [Verify] sends the OTP then expands inline boxes
 *             → auto-verifies via verifyEmailOtp on last digit, saves
 *             tokens, clears pendingEmail
 *
 * Continue is only active once email is verified (tokens obtained).
 * If user closes before verifying, pendingEmail stays in AsyncStorage
 * so the next launch routes back here.
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
import {
  sendOtp,
  verifyPhoneOnly,
  verifyEmailOtp,
  resendEmailOtp,
} from '../../api/auth';
import { clearPendingEmail } from '../../storage/authStorage';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';

const CODE_LEN     = 6;
const RESEND_SECS  = 30;
const RISE_DUR     = 550;
const RISE_EASE    = Easing.bezier(0.2, 0.7, 0.3, 1);

// ─── small SVG icons ──────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.87a16 16 0 0 0 6.22 6.22l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
        stroke={Colors.ink3}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
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
  );
}

function CheckIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="20 6 9 17 4 12"
        stroke={Colors.mint}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
  /** E.164 phone number, e.g. "+923114440959" — used for OTP API calls */
  phone: string;
  /** Human-friendly display, e.g. "+92 3114440959" — shown in the row */
  phoneDisplay: string;
  email: string;
  onVerified: () => void;
  onBack?: () => void;
}

export function AccountVerificationScreen({
  phone,
  phoneDisplay,
  email,
  onVerified,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();

  // ── phone verification state ───────────────────────────────────────────────
  const [phoneExpanded, setPhoneExpanded]   = useState(false);
  const [phoneVerified, setPhoneVerified]   = useState(false);
  const [phoneDigits,   setPhoneDigits]     = useState<string[]>(Array(CODE_LEN).fill(''));
  const [phoneFocus,    setPhoneFocus]      = useState<number | null>(null);
  const [phoneError,    setPhoneError]      = useState<string | null>(null);
  const [phoneSending,  setPhoneSending]    = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneSecs,     setPhoneSecs]       = useState(0);
  const phoneRefs = useRef<(TextInput | null)[]>([]);

  // ── email verification state ───────────────────────────────────────────────
  const [emailExpanded, setEmailExpanded]   = useState(false);
  const [emailVerified, setEmailVerified]   = useState(false);
  const [emailDigits,   setEmailDigits]     = useState<string[]>(Array(CODE_LEN).fill(''));
  const [emailFocus,    setEmailFocus]      = useState<number | null>(null);
  const [emailError,    setEmailError]      = useState<string | null>(null);
  const [emailSending,  setEmailSending]    = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailSecs,     setEmailSecs]       = useState(0);
  const emailRefs = useRef<(TextInput | null)[]>([]);

  // ── resend countdown timers ────────────────────────────────────────────────
  useEffect(() => {
    if (phoneSecs <= 0) return;
    const t = setTimeout(() => setPhoneSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneSecs]);

  useEffect(() => {
    if (emailSecs <= 0) return;
    const t = setTimeout(() => setEmailSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [emailSecs]);

  // ── entrance animations ────────────────────────────────────────────────────
  const aHead  = useRef(new Animated.Value(0)).current;
  const aPhone = useRef(new Animated.Value(0)).current;
  const aEmail = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const make = (anim: Animated.Value, delay: number) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DUR,
        delay,
        easing: RISE_EASE,
        useNativeDriver: true,
      });
    Animated.parallel([make(aHead, 70), make(aPhone, 150), make(aEmail, 230)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── phone OTP helpers ──────────────────────────────────────────────────────

  async function handlePhoneTapVerify() {
    setPhoneSending(true);
    setPhoneError(null);
    try {
      await sendOtp(phone);
      setPhoneSecs(RESEND_SECS);
      setPhoneExpanded(true);
      setTimeout(() => phoneRefs.current[0]?.focus(), 120);
    } catch (err: any) {
      setPhoneError(err?.message ?? 'Failed to send code. Try again.');
    } finally {
      setPhoneSending(false);
    }
  }

  async function handlePhoneResend() {
    if (phoneSecs > 0) return;
    setPhoneSending(true);
    setPhoneDigits(Array(CODE_LEN).fill(''));
    setPhoneError(null);
    try {
      await sendOtp(phone);
      setPhoneSecs(RESEND_SECS);
      setTimeout(() => phoneRefs.current[0]?.focus(), 120);
    } catch { /* silent */ }
    finally { setPhoneSending(false); }
  }

  function handlePhoneDigitChange(text: string, idx: number) {
    const char = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...phoneDigits];
    next[idx] = char;
    setPhoneDigits(next);
    setPhoneError(null);
    if (char && idx < CODE_LEN - 1) {
      phoneRefs.current[idx + 1]?.focus();
    } else if (!char && idx > 0) {
      phoneRefs.current[idx - 1]?.focus();
    }
    if (char && idx === CODE_LEN - 1 && next.every(d => d !== '')) {
      doVerifyPhone(next.join(''));
    }
  }

  function handlePhoneKeyPress(key: string, idx: number) {
    if (key === 'Backspace' && !phoneDigits[idx] && idx > 0) {
      const next = [...phoneDigits];
      next[idx - 1] = '';
      setPhoneDigits(next);
      phoneRefs.current[idx - 1]?.focus();
    }
  }

  async function doVerifyPhone(code: string) {
    setPhoneVerifying(true);
    setPhoneError(null);
    try {
      await verifyPhoneOnly(phone, code);
      setPhoneVerified(true);
      setPhoneExpanded(false);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      const isUserFacing = msg && !msg.includes('AsyncStorage') && !msg.includes('null') && !msg.includes('undefined');
      setPhoneError(isUserFacing ? msg : 'Invalid or expired code. Please try again.');
      setPhoneDigits(Array(CODE_LEN).fill(''));
      setTimeout(() => phoneRefs.current[0]?.focus(), 120);
    } finally {
      setPhoneVerifying(false);
    }
  }

  // ── email OTP helpers ──────────────────────────────────────────────────────

  async function handleEmailTapVerify() {
    if (emailExpanded) return;
    setEmailSending(true);
    setEmailError(null);
    try {
      await resendEmailOtp(email);
      setEmailSecs(RESEND_SECS);
      setEmailExpanded(true);
      setTimeout(() => emailRefs.current[0]?.focus(), 120);
    } catch (err: any) {
      setEmailError(err?.message ?? 'Failed to send code. Try again.');
    } finally {
      setEmailSending(false);
    }
  }

  async function handleEmailResend() {
    if (emailSecs > 0) return;
    setEmailDigits(Array(CODE_LEN).fill(''));
    setEmailError(null);
    setEmailSecs(RESEND_SECS);
    try { await resendEmailOtp(email); } catch { /* silent */ }
    setTimeout(() => emailRefs.current[0]?.focus(), 120);
  }

  function handleEmailDigitChange(text: string, idx: number) {
    const char = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...emailDigits];
    next[idx] = char;
    setEmailDigits(next);
    setEmailError(null);
    if (char && idx < CODE_LEN - 1) {
      emailRefs.current[idx + 1]?.focus();
    } else if (!char && idx > 0) {
      emailRefs.current[idx - 1]?.focus();
    }
    if (char && idx === CODE_LEN - 1 && next.every(d => d !== '')) {
      doVerifyEmail(next.join(''));
    }
  }

  function handleEmailKeyPress(key: string, idx: number) {
    if (key === 'Backspace' && !emailDigits[idx] && idx > 0) {
      const next = [...emailDigits];
      next[idx - 1] = '';
      setEmailDigits(next);
      emailRefs.current[idx - 1]?.focus();
    }
  }

  async function doVerifyEmail(code: string) {
    setEmailVerifying(true);
    setEmailError(null);
    try {
      await verifyEmailOtp(email, code);
      await clearPendingEmail();
      setEmailVerified(true);
      setEmailExpanded(false);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      // Don't expose internal/AsyncStorage errors — show a clean message
      const isUserFacing = msg && !msg.includes('AsyncStorage') && !msg.includes('null') && !msg.includes('undefined');
      setEmailError(isUserFacing ? msg : 'Invalid or expired code. Please try again.');
      setEmailDigits(Array(CODE_LEN).fill(''));
      setTimeout(() => emailRefs.current[0]?.focus(), 120);
    } finally {
      setEmailVerifying(false);
    }
  }

  // ── OTP boxes (shared render helper) ─────────────────────────────────────

  function renderOtpBoxes(
    digits: string[],
    focusedIdx: number | null,
    refs: React.MutableRefObject<(TextInput | null)[]>,
    onChange: (text: string, idx: number) => void,
    onKeyPress: (key: string, idx: number) => void,
    onFocusIdx: (i: number) => void,
    onBlur: () => void,
    error: string | null,
    verifying: boolean,
    secs: number,
    onResend: () => void,
  ) {
    return (
      <View style={s.otpSection}>
        <View style={s.otpRow}>
          {Array.from({ length: CODE_LEN }).map((_, i) => (
            <TextInput
              key={i}
              ref={r => { refs.current[i] = r; }}
              style={[
                s.ob,
                focusedIdx === i && s.obFocused,
                !!error && s.obError,
              ]}
              value={digits[i]}
              onChangeText={t => onChange(t, i)}
              onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key, i)}
              onFocus={() => onFocusIdx(i)}
              onBlur={onBlur}
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
              selectTextOnFocus
              caretHidden
              editable={!verifying}
            />
          ))}
        </View>
        {verifying && <Text style={s.verifyingText}>Verifying…</Text>}
        {!!error && !verifying && <Text style={s.errText}>{error}</Text>}
        <Pressable onPress={onResend} disabled={secs > 0} style={s.resendWrap}>
          <Text style={[s.resend, secs === 0 && s.resendActive]}>
            {secs > 0
              ? `Resend in 0:${String(secs).padStart(2, '0')}`
              : 'Resend code'}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── phone row ──────────────────────────────────────────────────────────────

  function renderPhoneRow() {
    if (phoneVerified) {
      return (
        <View style={s.row}>
          <PhoneIcon />
          <Text style={s.rowValueVerified}>{phoneDisplay || phone}</Text>
          <View style={s.verifiedBadge}>
            <CheckIcon />
            <Text style={s.verifiedLabel}>Verified</Text>
          </View>
        </View>
      );
    }

    return (
      <>
        <View style={s.row}>
          <PhoneIcon />
          <Text style={s.rowValue}>{phoneDisplay || phone}</Text>
          {!phoneExpanded && (
            <Pressable
              onPress={handlePhoneTapVerify}
              disabled={phoneSending}
              style={({ pressed }) => [s.verifyBtn, pressed && s.verifyBtnPressed]}>
              <Text style={s.verifyBtnLabel}>
                {phoneSending ? '…' : 'Verify'}
              </Text>
            </Pressable>
          )}
        </View>
        {phoneExpanded &&
          renderOtpBoxes(
            phoneDigits, phoneFocus, phoneRefs,
            handlePhoneDigitChange, handlePhoneKeyPress,
            i => setPhoneFocus(i), () => setPhoneFocus(null),
            phoneError, phoneVerifying,
            phoneSecs, handlePhoneResend,
          )
        }
        {!phoneExpanded && !!phoneError && (
          <Text style={s.errText}>{phoneError}</Text>
        )}
      </>
    );
  }

  // ── email row ──────────────────────────────────────────────────────────────

  function renderEmailRow() {
    if (emailVerified) {
      return (
        <View style={s.row}>
          <MailIcon />
          <Text style={s.rowValueVerified} numberOfLines={1}>{email}</Text>
          <View style={s.verifiedBadge}>
            <CheckIcon />
            <Text style={s.verifiedLabel}>Verified</Text>
          </View>
        </View>
      );
    }

    return (
      <>
        <View style={s.row}>
          <MailIcon />
          <Text style={s.rowValue} numberOfLines={1}>{email}</Text>
          {!emailExpanded && (
            <Pressable
              onPress={handleEmailTapVerify}
              disabled={emailSending}
              style={({ pressed }) => [s.verifyBtn, pressed && s.verifyBtnPressed]}>
              <Text style={s.verifyBtnLabel}>{emailSending ? '…' : 'Verify'}</Text>
            </Pressable>
          )}
        </View>
        {!emailExpanded && !!emailError && (
          <Text style={s.errText}>{emailError}</Text>
        )}
        {emailExpanded &&
          renderOtpBoxes(
            emailDigits, emailFocus, emailRefs,
            handleEmailDigitChange, handleEmailKeyPress,
            i => setEmailFocus(i), () => setEmailFocus(null),
            emailError, emailVerifying,
            emailSecs, handleEmailResend,
          )
        }
      </>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />
      <View
        style={[
          s.screen,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>

        {/* Navbar */}
        <View style={s.navbar}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              s.backBtn,
              { transform: [{ scale: pressed ? 0.92 : 1 }] },
            ]}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
              <Polyline
                points="15 18 9 12 15 6"
                stroke={Colors.vioInk}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <View style={s.prgTrack}>
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[s.prgFill, { width: '12%' }]}
            />
          </View>
        </View>

        {/* Body */}
        <View style={s.body}>
          <Animated.View style={[s.q, riseStyle(aHead)]}>
            <View style={s.kickerWrap}>
              <Text style={s.kicker}>Step 2 of 5</Text>
            </View>
            <Text style={s.heading}>Verify your{'\n'}accounts</Text>
            <Text style={s.subtitle}>
              Tap Verify next to each item below to confirm ownership.
            </Text>
          </Animated.View>

          {/* Phone card */}
          <Animated.View style={[s.card, riseStyle(aPhone)]}>
            <Text style={s.cardLabel}>Mobile number</Text>
            {__DEV__ && (
              <View style={s.devBanner}>
                <Text style={s.devBannerText}>Dev: SMS not sent — use code <Text style={s.devBannerCode}>000000</Text></Text>
              </View>
            )}
            {renderPhoneRow()}
          </Animated.View>

          {/* Email card */}
          <Animated.View style={[s.card, riseStyle(aEmail)]}>
            <Text style={s.cardLabel}>Email address</Text>
            {renderEmailRow()}
          </Animated.View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <GradientButton
            label="Continue"
            variant={emailVerified ? 'primary' : 'disabled'}
            onPress={emailVerified ? onVerified : undefined}
          />
        </View>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.page, overflow: 'hidden' },
  screen:  { flex: 1, paddingHorizontal: 16, flexDirection: 'column' },

  // ── navbar ──
  navbar:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 4, flexShrink: 0 },
  backBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: '#3C2878', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  prgTrack: { flex: 1, height: 7, borderRadius: 5, backgroundColor: 'rgba(155,123,240,0.16)', overflow: 'hidden' },
  prgFill:  { height: '100%', borderRadius: 5 },

  // ── heading ──
  body:      { flex: 1 },
  q:         { paddingTop: 18, paddingHorizontal: 2, paddingBottom: 4 },
  kickerWrap:{ flexDirection: 'row', marginBottom: 10 },
  kicker:    { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: Colors.vioInk, backgroundColor: Colors.vioSoft, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 9 },
  heading:   { fontSize: 24, fontWeight: '800', letterSpacing: -0.7, lineHeight: 29, color: Colors.ink },
  subtitle:  { fontSize: 13, color: Colors.ink2, marginTop: 8, lineHeight: 20 },

  // ── cards ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.ink3,
    marginBottom: 10,
  },

  // ── row ──
  row:            { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowValue:       { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.ink },
  rowValueVerified: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.mintInk },

  // ── verify button ──
  verifyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.vioSoft,
    flexShrink: 0,
  },
  verifyBtnPressed: { opacity: 0.65 },
  verifyBtnLoading: { opacity: 0.5 },
  verifyBtnLabel: { fontSize: 12.5, fontWeight: '800', color: Colors.vioD },

  // ── verified badge ──
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: Colors.mintSoft,
    flexShrink: 0,
  },
  verifiedLabel: { fontSize: 12, fontWeight: '800', color: Colors.mintInk },

  // ── OTP boxes ──
  otpSection: { marginTop: 14 },
  otpRow:     { flexDirection: 'row', gap: 8 },
  ob: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.page,
    borderWidth: 1.5,
    borderColor: 'rgba(155,123,240,0.2)',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    textAlign: 'center',
    elevation: 1,
  },
  obFocused: { borderColor: Colors.vio, shadowColor: Colors.vio, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3 },
  obError:   { borderColor: '#D9304F', backgroundColor: '#FFF4F8' },
  errText:      { fontSize: 12, fontWeight: '700', color: '#D9304F', marginTop: 6 },
  verifyingText: { fontSize: 12, color: Colors.ink3, marginTop: 6, fontStyle: 'italic' },

  // ── dev banner ──
  devBanner:     { backgroundColor: '#FFF9C4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  devBannerText: { fontSize: 11.5, color: '#7A6000' },
  devBannerCode: { fontWeight: '800', fontFamily: 'Courier', letterSpacing: 2 },

  // ── resend ──
  resendWrap:  { marginTop: 8, alignSelf: 'flex-start' },
  resend:      { fontSize: 12, color: Colors.ink3 },
  resendActive:{ color: Colors.vioD, fontWeight: '700' },

  // ── footer ──
  footer:    { paddingTop: 12, flexShrink: 0 },
});
