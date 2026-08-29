/**
 * EmailVerificationScreen
 *
 * Shows after registration. User enters the 6-digit OTP sent to their email.
 * After verification, tokens are stored and onboarding continues.
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
import { verifyEmailOtp, resendEmailOtp } from '../../api/auth';
import { clearPendingEmail } from '../../storage/authStorage';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;
const RISE_DURATION = 550;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);

function useFadeRise(delay: number) {
  const anim = useRef(new Animated.Value(0)).current;
  return { anim, delay };
}
function riseStyle(anim: Animated.Value) {
  return {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }],
  };
}

interface EmailVerificationScreenProps {
  email: string;
  onVerified?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
}

export function EmailVerificationScreen({ email, onVerified, onBack, onSkip }: EmailVerificationScreenProps) {
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const isComplete = digits.every(d => d !== '');

  useEffect(() => {
    if (secondsLeft <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const aQ = useFadeRise(70);
  const aOtp = useFadeRise(150);
  const aBot = useFadeRise(230);

  useEffect(() => {
    const make = ({ anim, delay }: ReturnType<typeof useFadeRise>) =>
      Animated.timing(anim, { toValue: 1, duration: RISE_DURATION, delay, easing: RISE_EASING, useNativeDriver: true });
    Animated.parallel([make(aQ), make(aOtp), make(aBot)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(text: string, idx: number) {
    const char = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
    else if (!char && idx > 0) inputRefs.current[idx - 1]?.focus();
  }

  function handleKeyPress(key: string, idx: number) {
    if (key === 'Backspace' && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = '';
      setDigits(next);
      inputRefs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify() {
    if (!isComplete || verifying) return;
    setVerifying(true);
    setApiError(null);
    try {
      await verifyEmailOtp(email, digits.join(''));
      await clearPendingEmail();
      onVerified?.();
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
    try { await resendEmailOtp(email); } catch { /* silent */ }
  }

  const buttonVariant = !isComplete || !!apiError ? 'disabled' : 'primary';
  const timerLabel = canResend ? 'Resend code' : `Resend in 0:${String(secondsLeft).padStart(2, '0')}`;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) }]}>

        {/* Navbar */}
        <View style={styles.navbar}>
          <Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
              <Polyline points="15 18 9 12 15 6" stroke={Colors.vioInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={styles.prgTrack}>
            <LinearGradient colors={[...GradientColors.primary]} locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.prgFill, { width: '12%' }]} />
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Animated.View style={[styles.q, riseStyle(aQ.anim)]}>
            <View style={styles.qkWrap}><Text style={styles.qk}>Step 1 of 5</Text></View>
            <Text style={styles.qh}>Verify your email</Text>
            <Text style={styles.qs}>
              {'We sent a 6-digit code to '}
              <Text style={styles.qsEmail}>{email}</Text>
            </Text>
          </Animated.View>

          {/* OTP boxes */}
          <Animated.View style={riseStyle(aOtp.anim)}>
            <View style={styles.otp}>
              {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                <TextInput
                  key={i}
                  ref={r => { inputRefs.current[i] = r; }}
                  style={[styles.ob, focusedIdx === i && styles.obFocused, !!apiError && styles.obError]}
                  value={digits[i]}
                  onChangeText={text => handleChange(text, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  onFocus={() => setFocusedIdx(i)}
                  onBlur={() => setFocusedIdx(null)}
                  keyboardType="number-pad"
                  maxLength={2}
                  textAlign="center"
                  selectTextOnFocus
                  caretHidden
                />
              ))}
            </View>
            {!!apiError && <Text style={styles.errText}>{apiError}</Text>}
          </Animated.View>

          <Animated.View style={riseStyle(aBot.anim)}>
            <Pressable onPress={handleResend} disabled={!canResend} style={styles.resendWrap}>
              <Text style={[styles.resend, canResend && styles.resendActive]}>{timerLabel}</Text>
            </Pressable>
            {/* Email info banner */}
            <LinearGradient colors={['#EEF0FE', '#E8ECFD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={Colors.vioInk} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M22 6l-10 7L2 6" stroke={Colors.vioInk} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Check your inbox</Text>
                <Text style={styles.bannerText}>Can't find it? Check spam or request a new code.</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <GradientButton label={verifying ? 'Verifying…' : 'Verify email'} variant={buttonVariant} onPress={handleVerify} loading={verifying} />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.page, overflow: 'hidden' },
  screen: { flex: 1, paddingHorizontal: 16, flexDirection: 'column' },
  navbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 4, flexShrink: 0 },
  backBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: '#3C2878', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  prgTrack: { flex: 1, height: 7, borderRadius: 5, backgroundColor: 'rgba(155,123,240,0.16)', overflow: 'hidden' },
  prgFill: { height: '100%', borderRadius: 5 },
  body: { flex: 1, flexDirection: 'column' },
  q: { paddingTop: 18, paddingHorizontal: 2, paddingBottom: 2, flexShrink: 0 },
  qkWrap: { flexDirection: 'row', marginBottom: 10 },
  qk: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: Colors.vioInk, backgroundColor: Colors.vioSoft, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 9 },
  qh: { fontSize: 24, fontWeight: '800', letterSpacing: -0.7, lineHeight: 29, color: Colors.ink },
  qs: { fontSize: 13, color: Colors.ink2, marginTop: 8, lineHeight: 20 },
  qsEmail: { fontWeight: '700', color: Colors.ink },
  otp: { flexDirection: 'row', gap: 8, marginTop: 16 },
  ob: { flex: 1, height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1.6, borderColor: 'rgba(155,123,240,0.2)', fontSize: 22, fontWeight: '800', color: Colors.ink, textAlign: 'center', shadowColor: '#3C2878', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  obFocused: { borderColor: Colors.vio, shadowColor: Colors.vio, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.16, shadowRadius: 4, elevation: 4 },
  obError: { borderColor: '#D9304F', backgroundColor: '#FFF4F8' },
  errText: { fontSize: 12, fontWeight: '700', color: '#D9304F', marginTop: 7 },
  resendWrap: { marginTop: 12, alignSelf: 'flex-start' },
  resend: { fontSize: 11.5, color: Colors.ink3, lineHeight: 17 },
  resendActive: { color: Colors.vioD, fontWeight: '700' },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 14, marginTop: 12 },
  bannerTitle: { fontSize: 13, fontWeight: '800', color: Colors.vioInk, marginBottom: 2 },
  bannerText: { fontSize: 11.5, lineHeight: 17, color: Colors.vioD },
  footer: { paddingTop: 12, flexShrink: 0 },
  skipBtn: { alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 8 },
  skipLabel: { fontSize: 12.5, fontWeight: '700', color: '#999' },
});
