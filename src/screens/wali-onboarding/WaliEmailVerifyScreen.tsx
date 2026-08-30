/**
 * WaliEmailVerifyScreen — W3
 *
 * Sits between the invite code (W2) and the role explainer (W4).
 *
 * Redeeming the invite creates an *unconfirmed* Supabase identity, so the
 * account does not exist as far as sign-in is concerned until the emailed code
 * comes back. This screen is where that happens: it shows the address the code
 * will go to, lets the wali correct it before spending a send, and takes the
 * code.
 *
 * Two phases in one screen, driven by the parent's `codeSent` — not by local
 * state, so a send that fails leaves the wali on the address step instead of
 * stranding them at a code field no code is coming to.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { Colors, GRAD } from '../../theme/colors';

/**
 * Supabase decides the code length (Auth -> Email -> Email OTP Length) and
 * GoTrue allows 6-10; the project currently issues 8. A fixed row of boxes
 * would have to guess that number and would be wrong the moment the dashboard
 * setting changes, so the code is taken in one field and only its bounds are
 * enforced here. The server remains the authority on whether a code is right.
 */
const CODE_MIN = 6;
const CODE_MAX = 10;
const RESEND_SECONDS = 30;

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vioInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vio} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={2} y={4} width={20} height={16} rx={3} />
      <Path d="M2.5 7.5l8.4 5.6a2 2 0 002.2 0l8.4-5.6" />
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
interface WaliEmailVerifyScreenProps {
  /** Address the code is sent to — shown so a typo is caught before a send. */
  email: string;
  /** True once the server has accepted a send; flips the screen to code entry. */
  codeSent?: boolean;
  onBack?: () => void;
  /** Return to the account screen to correct the address. */
  onChangeEmail?: () => void;
  onSendCode?: () => void;
  onVerify?: (code: string) => void;
  sending?: boolean;
  verifying?: boolean;
  error?: string;
}

// ─── component ────────────────────────────────────────────────────────────────
export function WaliEmailVerifyScreen({
  email,
  codeSent = false,
  onBack,
  onChangeEmail,
  onSendCode,
  onVerify,
  sending = false,
  verifying = false,
  error,
}: WaliEmailVerifyScreenProps) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  // React.ComponentRef, not `TextInput`: under RN 0.87 the bare component type
  // is not the instance type, so `.focus()` is absent and the ref prop rejects it.
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const busy = sending || verifying;
  const canVerify = code.length >= CODE_MIN && !busy;

  // Start the resend cooldown when a send lands, and focus the field so the
  // wali can type (or paste) straight away.
  useEffect(() => {
    if (!codeSent) return;
    setSecondsLeft(RESEND_SECONDS);
    inputRef.current?.focus();
  }, [codeSent]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  function handleChange(text: string) {
    setCode(text.replace(/\D/g, '').slice(0, CODE_MAX));
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      {/* Nav bar */}
      <View style={styles.navbar}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <BackIcon />
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>
            {codeSent ? 'Enter the code\nwe emailed you' : 'Confirm your\nemail address'}
          </Text>
          <Text style={styles.subheading}>
            {codeSent
              ? 'Check your inbox — and your spam folder, in case it landed there.'
              : 'We will send a code to this address. You will need it to finish setting up your account.'}
          </Text>
        </View>

        {/* Address card — always visible, so the wali can see where the code went */}
        <View style={styles.emailCard}>
          <MailIcon />
          <Text style={styles.emailText} numberOfLines={1} ellipsizeMode="middle">
            {email}
          </Text>
          {!codeSent ? (
            <Pressable onPress={onChangeEmail} hitSlop={8} disabled={busy}>
              <Text style={[styles.changeLink, busy && styles.linkDisabled]}>Change</Text>
            </Pressable>
          ) : null}
        </View>

        {codeSent ? (
          <>
            {/* Code field — single input, see CODE_MIN/CODE_MAX above */}
            <Pressable onPress={() => inputRef.current?.focus()} style={styles.codeWrap}>
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleChange}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                placeholder="••••••"
                placeholderTextColor={Colors.ink3}
                maxLength={CODE_MAX}
                editable={!busy}
                style={styles.codeInput}
              />
            </Pressable>

            {verifying ? (
              <View style={styles.loaderRow}>
                {/* Fixed box — see WaliCodeEntryScreen: the indicator collapses
                    to a clipped sliver without explicit dimensions. */}
                <View style={styles.loaderSpinner}>
                  <ActivityIndicator size="small" color={Colors.vio} />
                </View>
                <Text style={styles.loaderText}>Verifying…</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Resend */}
            <View style={styles.resendRow}>
              {secondsLeft > 0 ? (
                <Text style={styles.resendMuted}>
                  Resend in 0:{String(secondsLeft).padStart(2, '0')}
                </Text>
              ) : (
                <Pressable onPress={onSendCode} hitSlop={8} disabled={busy}>
                  <Text style={[styles.resendLink, busy && styles.linkDisabled]}>
                    {sending ? 'Sending…' : 'Resend code'}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        ) : (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Mint banner — reassurance, matching W5's "No ID needed" treatment */}
            <View style={styles.banner}>
              <ShieldIcon />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Why we ask</Text>
                <Text style={styles.bannerBody}>
                  Your email is how you sign in, and how families reach you. Confirming it keeps
                  your account yours.
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {codeSent ? (
          <Pressable
            onPress={() => canVerify && onVerify?.(code)}
            style={({ pressed }) => [{ opacity: pressed && canVerify ? 0.9 : 1 }]}>
            {canVerify ? (
              <LinearGradient
                colors={[...GRAD]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.btnFilled}>
                <Text style={styles.btnFilledText}>Verify email</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.btnFilled, styles.btnDisabled]}>
                {verifying
                  ? <ActivityIndicator color={Colors.vio} />
                  : <Text style={styles.btnDisabledText}>Verify email</Text>}
              </View>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={() => !busy && onSendCode?.()}
            style={({ pressed }) => [{ opacity: pressed && !busy ? 0.9 : 1 }]}>
            {busy ? (
              <View style={[styles.btnFilled, styles.btnDisabled]}>
                <ActivityIndicator color={Colors.vio} />
              </View>
            ) : (
              <LinearGradient
                colors={[...GRAD]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.btnFilled}>
                <Text style={styles.btnFilledText}>Send code</Text>
              </LinearGradient>
            )}
          </Pressable>
        )}
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
  body: {
    flex: 1,
    paddingTop: 18,
  },
  header: {
    marginBottom: 2,
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
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 58,
    marginTop: 16,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  emailText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.ink,
  },
  changeLink: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.vio,
  },
  linkDisabled: {
    color: Colors.ink3,
  },
  codeWrap: {
    marginTop: 12,
  },
  codeInput: {
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.6,
    borderColor: Colors.vio,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    color: Colors.ink,
    paddingVertical: 0,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  loaderSpinner: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 13,
    color: Colors.vio,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    color: '#C0392B',
    marginTop: 10,
    textAlign: 'center',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 14,
  },
  resendMuted: {
    fontSize: 13,
    color: Colors.ink3,
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.vio,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.mintSoft,
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
    color: '#0A6B4C',
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
  btnFilledText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#fff',
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
