/**
 * WaliVerifyScreen — W5
 *
 * "Confirm your number" — 6-digit OTP entry with auto-verify state.
 * Progress bar at 80% — "Step 4 of 4".
 * "No ID needed" mint banner.
 * "Resend in 0:19" countdown hint.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Colors, GRAD } from '../../theme/colors';

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vioInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={Colors.mintInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
interface WaliVerifyScreenProps {
  phoneNumber?: string;
  initialCountdown?: number;
  onVerified?: (code: string) => void;
  onBack?: () => void;
  onResend?: () => void;
}

// ─── component ────────────────────────────────────────────────────────────────
export function WaliVerifyScreen({
  phoneNumber = '+92 321 ••• 8890',
  initialCountdown = 19,
  onVerified,
  onBack,
  onResend,
}: WaliVerifyScreenProps) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(initialCountdown);
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1_000);
    return () => clearInterval(timer);
  }, [countdown]);

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) {
      inputRef.current?.blur();
      setVerifying(true);
      // Auto-verify after a small delay for UX
      setTimeout(() => {
        onVerified?.(digits);
      }, 800);
    }
  }

  function handleResend() {
    setCountdown(initialCountdown);
    setCode('');
    onResend?.();
    setTimeout(() => inputRef.current?.focus(), 200);
  }

  function formatCountdown(s: number) {
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${ss.toString().padStart(2, '0')}`;
  }

  function renderBoxes() {
    return Array.from({ length: 6 }).map((_, i) => {
      const char = code[i] ?? '';
      const focused = i === code.length && code.length < 6 && !verifying;
      return (
        <View key={i} style={[styles.otpBox, focused && styles.otpBoxFocused]}>
          <Text style={styles.otpChar}>{char}</Text>
        </View>
      );
    });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      {/* Nav bar */}
      <View style={styles.navbar}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <BackIcon />
        </Pressable>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[...GRAD]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.progressFill}
          />
        </View>
      </View>

      <View style={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>Step 4 of 4</Text>
          </View>
          <Text style={styles.heading}>Confirm your{'\n'}number</Text>
          <Text style={styles.subheading}>
            So {'\u0633\u0627\u0646\u0627' /* placeholder; use prop */}she knows it is really you, and so we can reach you when a proposal arrives.
          </Text>
        </View>

        {/* OTP boxes */}
        <Pressable onPress={() => !verifying && inputRef.current?.focus()} style={styles.otpRow}>
          {renderBoxes()}
        </Pressable>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.hiddenInput}
          caretHidden
          editable={!verifying}
        />

        {/* Sent-to hint */}
        <Text style={styles.hint}>
          Sent to {phoneNumber}
          {countdown > 0
            ? ` · Resend in ${formatCountdown(countdown)}`
            : ' · '}
          {countdown === 0 && (
            <Text style={styles.resendLink} onPress={handleResend}> Resend</Text>
          )}
        </Text>

        {/* Mint banner */}
        <View style={styles.mintBanner}>
          <ShieldIcon />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>No ID needed to be a wali</Text>
            <Text style={styles.bannerBody}>
              Only a phone number. She has already told us who you are.
            </Text>
          </View>
        </View>
      </View>

      {/* Footer — disabled/loading button */}
      <View style={styles.footer}>
        <View style={[styles.btnFilled, styles.btnDisabled]}>
          <Text style={styles.btnDisabledText}>
            {verifying ? 'Verifying\u2026' : 'Waiting for code\u2026'}
          </Text>
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
    paddingHorizontal: 20,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '80%',
    height: 7,
    borderRadius: 5,
  },
  body: {
    flex: 1,
    paddingTop: 18,
  },
  header: {
    marginBottom: 2,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vioSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
    marginBottom: 10,
  },
  stepText: {
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
    lineHeight: 30,
    color: Colors.ink,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 20,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  otpBox: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  otpBoxFocused: {
    borderColor: Colors.vio,
    shadowColor: Colors.vio,
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  otpChar: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  hint: {
    fontSize: 11.5,
    color: Colors.ink3,
    marginTop: 12,
    lineHeight: 18,
  },
  resendLink: {
    color: Colors.vioD,
    fontWeight: '700',
  },
  mintBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E9FBF3',
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.mintInk,
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#2A7A5E',
  },
  footer: {
    gap: 9,
  },
  btnFilled: {
    height: 54,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: 'rgba(155,123,240,0.13)',
  },
  btnDisabledText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#A79EC6',
  },
});
