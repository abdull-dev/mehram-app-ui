/**
 * ForgotPasswordScreen
 *
 * One screen, two stages, two routes.
 *
 *   stage 'choose'  pick email or phone, enter it, send a code
 *   stage 'reset'   enter the code and a new password
 *
 * Both routes exist because signup collects both an address and a number, and a
 * user who has lost access to one can still prove ownership with the other.
 * They differ only in which pair of endpoints they call:
 *
 *   email  →  POST /auth/forgot-password   then  POST /auth/reset-password
 *   phone  →  POST /auth/send-otp          then  POST /auth/reset-password-phone
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/colors';
import { GradientButton } from '../../components/ui/GradientButton';
import { e164Problem } from '../../utils/phone';
import {
  forgotPassword,
  resetPassword,
  resetPasswordByPhone,
  sendOtp,
} from '../../api/auth';

/** How long before "Resend code" becomes available again. */
const RESEND_COOLDOWN_S = 45;

type Route = 'email' | 'phone';
type Stage = 'choose' | 'reset';

function BackIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vioInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

interface ForgotPasswordScreenProps {
  onBack?: () => void;
  /** Password changed — the caller sends them to sign in. */
  onDone?: () => void;
  /** Prefills whichever field the user already typed on the previous screen. */
  initialEmail?: string;
  initialPhoneE164?: string;
}

export function ForgotPasswordScreen({
  onBack,
  onDone,
  initialEmail,
  initialPhoneE164,
}: ForgotPasswordScreenProps) {
  const insets = useSafeAreaInsets();

  // Opens on whichever identifier the previous screen carried, so the user is
  // not asked for something they already typed.
  const [route, setRoute] = useState<Route>(
    initialPhoneE164 && !initialEmail ? 'phone' : 'email',
  );
  const [stage, setStage] = useState<Stage>('choose');

  const [email, setEmail] = useState(initialEmail ?? '');
  const [phone, setPhone] = useState(initialPhoneE164 ?? '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Seconds until "Resend code" is available; 0 means it is. */
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    timer.current = setInterval(() => setCooldown(c => (c <= 1 ? 0 : c - 1)), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [cooldown]);

  const target = route === 'email' ? email.trim().toLowerCase() : phone.trim();

  /** Client-side shape check, so an obvious typo does not cost a round-trip. */
  function targetProblem(): string | null {
    if (route === 'email') {
      if (!target) return 'Enter your email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(target)) return 'That does not look like an email address.';
      return null;
    }
    if (!target) return 'Enter your phone number.';
    // The generic E.164 shape accepted numbers no country actually issues, so
    // a typo here cost an SMS that could never arrive.
    return e164Problem(target);
  }

  async function sendCode(isResend = false) {
    const problem = targetProblem();
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      if (route === 'email') {
        await forgotPassword(target);
      } else {
        await sendOtp(target);
      }
      setStage('reset');
      setCooldown(RESEND_COOLDOWN_S);
      setNotice(
        isResend
          ? 'A new code is on its way.'
          : route === 'email'
            ? `We sent a code to ${target}.`
            : `We sent a code by SMS to ${target}.`,
      );
    } catch (e: any) {
      setError(e?.message ?? 'Could not send a code. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    if (!otp.trim()) { setError('Enter the code we sent you.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Both passwords must match.'); return; }

    setBusy(true); setError(null); setNotice(null);
    try {
      if (route === 'email') {
        await resetPassword(target, otp.trim(), password);
      } else {
        await resetPasswordByPhone(target, otp.trim(), password);
      }
      onDone?.();
    } catch (e: any) {
      setError(e?.message ?? 'Could not reset your password. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable
          onPress={stage === 'reset' ? () => { setStage('choose'); setError(null); } : onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}>
          <BackIcon />
        </Pressable>
        <Text style={styles.topTitle}>
          {stage === 'choose' ? 'Reset your password' : 'Enter your code'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {stage === 'choose' ? (
          <>
            <Text style={styles.lede}>
              We will send you a code to confirm it is you. Choose where to send it.
            </Text>

            {/* Segmented, not a dropdown: two options both worth seeing. */}
            <View style={styles.seg}>
              {(['email', 'phone'] as const).map(r => (
                <Pressable
                  key={r}
                  onPress={() => { setRoute(r); setError(null); }}
                  style={[styles.segItem, route === r && styles.segItemOn]}>
                  <Text style={[styles.segText, route === r && styles.segTextOn]}>
                    {r === 'email' ? 'By email' : 'By SMS'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>
              {route === 'email' ? 'EMAIL ADDRESS' : 'PHONE NUMBER'}
            </Text>
            <TextInput
              style={styles.input}
              value={route === 'email' ? email : phone}
              onChangeText={route === 'email' ? setEmail : setPhone}
              placeholder={route === 'email' ? 'your@email.com' : '+923001234567'}
              placeholderTextColor={Colors.ink3}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={route === 'email' ? 'email-address' : 'phone-pad'}
              editable={!busy}
            />
            <Text style={styles.hint}>
              {route === 'email'
                ? 'Use the address you signed up with.'
                : 'Include your country code, starting with +.'}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.lede}>
              {route === 'email'
                ? `Enter the code we emailed to ${target}, then choose a new password.`
                : `Enter the code we sent to ${target}, then choose a new password.`}
            </Text>

            <Text style={styles.label}>CODE</Text>
            <TextInput
              style={[styles.input, styles.inputCode]}
              value={otp}
              onChangeText={t => setOtp(t.replace(/\D/g, ''))}
              placeholder="000000"
              placeholderTextColor={Colors.ink3}
              keyboardType="number-pad"
              maxLength={10}
              editable={!busy}
            />

            <Text style={styles.label}>NEW PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              placeholderTextColor={Colors.ink3}
              secureTextEntry
              autoCapitalize="none"
              editable={!busy}
            />

            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat password"
              placeholderTextColor={Colors.ink3}
              secureTextEntry
              autoCapitalize="none"
              editable={!busy}
            />

            {/* Cooldown before resending, so a user who taps twice does not
                invalidate the code they are about to type. */}
            <Pressable
              onPress={() => sendCode(true)}
              disabled={busy || cooldown > 0}
              style={styles.resend}>
              <Text style={[styles.resendText, (busy || cooldown > 0) && { color: Colors.ink3 }]}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </Text>
            </Pressable>
          </>
        )}

        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.footer}>
          {busy ? (
            <View style={styles.busyBox}>
              <ActivityIndicator color={Colors.vioD} />
            </View>
          ) : (
            <GradientButton
              label={stage === 'choose' ? 'Send code' : 'Set new password'}
              onPress={stage === 'choose' ? () => sendCode(false) : submitReset}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.page },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3C2878', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
  },
  topTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, color: Colors.ink },

  scroll: { paddingHorizontal: 20, paddingTop: 14 },
  lede: { fontSize: 14.5, lineHeight: 21, color: Colors.ink2, marginBottom: 20 },

  seg: {
    flexDirection: 'row', backgroundColor: '#EDECF4',
    borderRadius: 14, padding: 4, marginBottom: 22,
  },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11 },
  segItemOn: {
    backgroundColor: '#fff',
    shadowColor: 'rgba(40,30,80,0.08)', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  segText: { fontSize: 13.5, fontWeight: '700', color: Colors.ink3 },
  segTextOn: { color: Colors.vioD },

  label: {
    fontSize: 10.5, fontWeight: '700', letterSpacing: 1,
    color: Colors.ink3, marginBottom: 7, marginTop: 4,
  },
  input: {
    height: 52, borderRadius: 16, paddingHorizontal: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.6, borderColor: 'rgba(155,123,240,0.2)',
    fontSize: 15, color: Colors.ink, marginBottom: 4,
  },
  inputCode: { letterSpacing: 5, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 12, color: Colors.ink3, marginBottom: 18, marginTop: 3 },

  resend: { alignSelf: 'flex-start', paddingVertical: 10, marginTop: 6 },
  resendText: { fontSize: 13.5, fontWeight: '700', color: Colors.vioD },

  notice: { fontSize: 13, lineHeight: 19, color: '#0A5C43', marginTop: 10 },
  error: { fontSize: 13, lineHeight: 19, color: '#A31C48', marginTop: 10 },

  footer: { marginTop: 24 },
  busyBox: { height: 54, alignItems: 'center', justifyContent: 'center' },
});
