/**
 * PhoneScreen  (F3)
 *
 * Step 1 of 5 — Phone + email entry.
 * Both are required. User can also continue with Google instead of email+phone.
 *
 *   ┌─────────────────────────────────┐
 *   │  ← [====6%==================]   │  NavBar
 *   ├─────────────────────────────────┤
 *   │  Step 1 of 5                    │
 *   │  Create your account            │
 *   │  subtitle                       │
 *   │  MOBILE NUMBER  [field]         │
 *   │  EMAIL ADDRESS  [field]         │
 *   │  ─── or ───                     │
 *   │  [G  Continue with Google]      │
 *   ├─────────────────────────────────┤
 *   │  [Send code]                    │
 *   └─────────────────────────────────┘
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { registerUser } from '../../api/auth';
import { savePendingEmail, savePendingPhone } from '../../storage/authStorage';
import { COUNTRIES, Country, nationalPart, splitE164, toE164 } from '../../utils/phone';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
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
function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <Path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </Svg>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
interface PhoneScreenProps {
  /** Called when the user taps the back chevron */
  onBack?: () => void;
  /** Called with phone, dialCode, email, password, phoneE164 when "Continue" is tapped */
  onSendCode?: (phone: string, dialCode: string, email: string, password: string, phoneE164: string) => void;
  /** Called when user taps "Continue with Google" */
  onGoogleSignIn?: () => void;
  /** DEV ONLY — skip phone verification entirely */
  onSkip?: () => void;
  /**
   * Values to open the form on, used by AccountVerification's "Change number"
   * and "Change email". The password is only known while the session that
   * signed up is still in memory; after a relaunch it is absent and the user
   * re-enters it, which is also what re-authorises the change.
   */
  initial?: { phoneE164?: string; email?: string; password?: string };
  /** Which field to open focused. */
  focusField?: 'phone' | 'email';
  /**
   * Re-submitting details for a signup that has not been confirmed yet, rather
   * than creating one. Only the copy differs — the request is the same
   * `POST /auth/register`, which the backend reconciles onto the pending
   * identity and answers with fresh codes.
   */
  editing?: boolean;
}

export function PhoneScreen({
  onBack,
  onSendCode,
  onGoogleSignIn,
  onSkip,
  initial,
  focusField,
  editing = false,
}: PhoneScreenProps) {
  const insets = useSafeAreaInsets();
  // Lazy initialisers: the split runs once, so editing the field afterwards is
  // never undone by a re-render re-deriving it from the same prop.
  const [country, setCountry] = useState<Country>(
    () => splitE164(initial?.phoneE164 ?? '').country,
  );
  const [phone, setPhone] = useState(
    () => splitE164(initial?.phoneE164 ?? '').national,
  );
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [confirmPassword, setConfirmPassword] = useState(initial?.password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    phone?: string; email?: string; password?: string; confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // ComponentRef, not the component type: `useRef<TextInput>` types the ref as
  // the component itself, which has no `focus`, so every focus call and every
  // `ref=` here was an error against React Native's current typings.
  const phoneRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const emailRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const confirmRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  function validate(): boolean {
    const e: typeof errors = {};
    const digits = phone.replace(/\D/g, '');
    if (!phone.trim()) {
      e.phone = 'Please enter your mobile number.';
    } else if (digits.length < 5) {
      e.phone = 'Please enter a valid mobile number.';
    }
    if (!email.trim()) {
      e.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = 'Please enter a valid email address.';
    }
    if (!password) {
      e.password = 'Please create a password.';
    } else if (password.length < 8) {
      e.password = 'Password must be at least 8 characters.';
    }
    if (!confirmPassword) {
      e.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      e.confirmPassword = 'Passwords do not match.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSend() {
    if (!validate() || loading) return;
    setLoading(true);
    try {
      const dialCode = country.code.replace(/[^+\d]/g, '');
      const e164 = toE164(dialCode, phone);
      await registerUser({
        fullName: email.split('@')[0],
        email: email.trim().toLowerCase(),
        phone: e164,
        password,
      });
      await savePendingEmail(email.trim().toLowerCase());
      // Stored here, awaited, alongside the email rather than fire-and-forget
      // after navigation: the verify screen hides the phone row entirely when
      // it has no number, so losing this write costs the user the phone step.
      await savePendingPhone(e164);
      // Display the normalised national part, so the verification screen shows
      // the number the code was actually sent to.
      onSendCode?.(
        nationalPart(country.code, phone),
        // The chip label, not the raw `code`: Canada's is "+1 CA", which the
        // verification screen would otherwise print inside the number.
        dialCode,
        email.trim().toLowerCase(),
        password,
        e164,
      );
    } catch (err: any) {
      const msg: string = err?.message ?? 'Could not create account. Please try again.';
      const lower = msg.toLowerCase();
      if (lower.includes('phone')) {
        setErrors(e => ({ ...e, phone: msg }));
      } else {
        setErrors(e => ({ ...e, email: msg }));
      }
    } finally {
      setLoading(false);
    }
  }

  // Staggered entrance
  const question = useFadeRise(70);
  const phoneField = useFadeRise(150);
  const emailField = useFadeRise(210);
  const passwordField = useFadeRise(270);
  const divider = useFadeRise(330);

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
      makeRise(phoneField),
      makeRise(emailField),
      makeRise(passwordField),
      makeRise(divider),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Open on the field the user came here to change. Delayed one tick past mount
   * so the entrance animation has laid the field out before the keyboard rises
   * over it; without the delay the focus lands on an element that is still at
   * its pre-animation offset and the scroll view jumps.
   */
  useEffect(() => {
    if (!focusField) return;
    const t = setTimeout(() => {
      (focusField === 'email' ? emailRef : phoneRef).current?.focus();
    }, 420);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = phone.trim() && email.trim() && password && confirmPassword && !loading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom + 24, 40),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── NavBar ────────────────────────────────────────────────── */}
          <View style={styles.navbar}>
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.backBtnPressed,
              ]}>
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15 18l-6-6 6-6"
                  stroke={Colors.vioInk}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
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

          {/* ── Question section ──────────────────────────────────────── */}
          <Animated.View style={[styles.qSection, riseStyle(question.anim)]}>
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>Step 1 of 5</Text>
            </View>
            <Text style={styles.heading}>
              {editing ? <>Change your{'\n'}details</> : <>Create your{'\n'}account</>}
            </Text>
            <Text style={styles.subtitle}>
              {editing
                ? 'Saving sends fresh codes. Any code you already received stops working.'
                : 'Phone verified by code · Email for account recovery'}
            </Text>
          </Animated.View>

          {/* ── Phone field ───────────────────────────────────────────── */}
          <Animated.View style={[styles.fieldWrap, riseStyle(phoneField.anim)]}>
            <Text style={styles.fieldLabel}>Mobile number</Text>
            <Pressable
              style={[styles.inputRow, errors.phone ? styles.inputRowError : null]}
              onPress={() => phoneRef.current?.focus()}>
              <Pressable onPress={() => setPickerOpen(true)} style={({ pressed }) => [styles.countryBtn, { opacity: pressed ? 0.65 : 1 }]}>
                <Text style={styles.countryCode}>{country.flag} {country.code}</Text>
              </Pressable>
              <View style={styles.inputDivider} />
              <TextInput
                ref={phoneRef}
                style={styles.textInput}
                value={phone}
                onChangeText={v => {
                  setPhone(nationalPart(country.code, v));
                  if (errors.phone) setErrors(e => ({ ...e, phone: undefined }));
                }}
                keyboardType="phone-pad"
                placeholder="Phone number"
                placeholderTextColor={Colors.ink3}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </Pressable>
            {errors.phone
              ? <Text style={styles.errorText}>{errors.phone}</Text>
              : <Text style={styles.hint}>Never shown to anyone on Mehram.</Text>}
          </Animated.View>

          {/* ── Email field ───────────────────────────────────────────── */}
          <Animated.View style={[styles.fieldWrap, riseStyle(emailField.anim)]}>
            <Text style={styles.fieldLabel}>Email address</Text>
            <Pressable
              style={[styles.inputRow, errors.email ? styles.inputRowError : null]}
              onPress={() => emailRef.current?.focus()}>
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
              <TextInput
                ref={emailRef}
                style={styles.textInput}
                value={email}
                onChangeText={v => {
                  setEmail(v);
                  if (errors.email) setErrors(e => ({ ...e, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="your@email.com"
                placeholderTextColor={Colors.ink3}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </Pressable>
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : (
              <Text style={styles.hint}>Used for account recovery only.</Text>
            )}
          </Animated.View>

          {/* ── Password fields ───────────────────────────────────────── */}
          <Animated.View style={riseStyle(passwordField.anim)}>
            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Password</Text>
              <Pressable
                style={[styles.inputRow, errors.password ? styles.inputRowError : null]}
                onPress={() => passwordRef.current?.focus()}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"
                    stroke={Colors.ink3}
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M7 11V7a5 5 0 0 1 10 0v4"
                    stroke={Colors.ink3}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <TextInput
                  ref={passwordRef}
                  style={styles.textInput}
                  value={password}
                  onChangeText={v => {
                    setPassword(v);
                    if (errors.password) setErrors(e => ({ ...e, password: undefined }));
                  }}
                  secureTextEntry={!showPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={Colors.ink3}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <Pressable onPress={() => setShowPassword(s => !s)} hitSlop={8}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    {showPassword ? (
                      <>
                        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke={Colors.ink3} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke={Colors.ink3} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M1 1l22 22" stroke={Colors.ink3} strokeWidth={1.8} strokeLinecap="round" />
                      </>
                    ) : (
                      <>
                        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={Colors.ink3} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" stroke={Colors.ink3} strokeWidth={1.8} strokeLinejoin="round" />
                      </>
                    )}
                  </Svg>
                </Pressable>
              </Pressable>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : (
                <Text style={styles.hint}>
                  {editing
                    ? 'Enter the password you signed up with — re-registering never rewrites a pending signup\u2019s password.'
                    : 'At least 8 characters.'}
                </Text>
              )}
            </View>

            {/* Confirm password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Confirm password</Text>
              <Pressable
                style={[styles.inputRow, errors.confirmPassword ? styles.inputRowError : null]}
                onPress={() => confirmRef.current?.focus()}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"
                    stroke={Colors.ink3}
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M7 11V7a5 5 0 0 1 10 0v4"
                    stroke={Colors.ink3}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <TextInput
                  ref={confirmRef}
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={v => {
                    setConfirmPassword(v);
                    if (errors.confirmPassword) setErrors(e => ({ ...e, confirmPassword: undefined }));
                  }}
                  secureTextEntry={!showConfirm}
                  placeholder="Repeat password"
                  placeholderTextColor={Colors.ink3}
                  returnKeyType="done"
                  onSubmitEditing={handleSend}
                />
                <Pressable onPress={() => setShowConfirm(s => !s)} hitSlop={8}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    {showConfirm ? (
                      <>
                        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke={Colors.ink3} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke={Colors.ink3} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M1 1l22 22" stroke={Colors.ink3} strokeWidth={1.8} strokeLinecap="round" />
                      </>
                    ) : (
                      <>
                        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={Colors.ink3} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" stroke={Colors.ink3} strokeWidth={1.8} strokeLinejoin="round" />
                      </>
                    )}
                  </Svg>
                </Pressable>
              </Pressable>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>
          </Animated.View>

          {/* ── Sign up + Divider + Google ────────────────────────────── */}
          <Animated.View style={[styles.footer, riseStyle(divider.anim)]}>
            <GradientButton
              label={editing ? 'Save and send codes' : 'Continue to signup'}
              variant={canSubmit ? 'primary' : 'disabled'}
              onPress={handleSend}
              loading={loading}
            />

            {/* Signing in with Google would abandon the pending signup these
                details belong to, so it is not offered while editing one. */}
            {!editing && (
              <>
                <View style={styles.orWrap}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>or</Text>
                  <View style={styles.orLine} />
                </View>

                <Pressable
                  onPress={onGoogleSignIn}
                  style={({ pressed }) => [
                    styles.googleBtn,
                    pressed && styles.googleBtnPressed,
                  ]}>
                  <GoogleIcon />
                  <Text style={styles.googleLabel}>Continue with Google</Text>
                </Pressable>
              </>
            )}

            {onSkip && (
              <Pressable onPress={onSkip} style={styles.skipBtn}>
                <Text style={styles.skipLabel}>⚡ Skip (dev only)</Text>
              </Pressable>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Country picker modal ─────────────────────────────────────── */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select country</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetList}>
              {COUNTRIES.map(c => (
                <TouchableOpacity
                  key={c.name}
                  style={[
                    styles.countryRow,
                    c.name === country.name && styles.countryRowActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setCountry(c);
                    setPickerOpen(false);
                  }}>
                  <Text style={styles.rowFlag}>{c.flag}</Text>
                  <Text style={styles.rowName}>{c.name}</Text>
                  <Text style={styles.rowCode}>{c.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  kav: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },

  // ── NavBar ──
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
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
    width: '6%',
    height: '100%',
    borderRadius: 5,
  },

  // ── Question section ──
  qSection: {
    paddingTop: 18,
    paddingHorizontal: 2,
    paddingBottom: 2,
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
  subtitle: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 8,
    lineHeight: 20,
  },

  // ── Fields ──
  fieldWrap: {
    marginTop: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.ink3,
    marginBottom: 8,
  },
  inputRow: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1.6,
    borderColor: Colors.vio,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 10,
    shadowColor: Colors.vio,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 0.16,
    elevation: 2,
  },
  inputRowError: {
    borderColor: '#D9304F',
    shadowColor: '#D9304F',
  },
  countryBtn: {
    flexShrink: 0,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.ink,
  },
  inputDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(155,123,240,0.22)',
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.ink,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  hint: {
    fontSize: 11.5,
    color: Colors.ink3,
    marginTop: 7,
    lineHeight: 17,
  },
  errorText: {
    fontSize: 11.5,
    color: '#D9304F',
    marginTop: 7,
    lineHeight: 17,
  },

  // ── Or divider ──
  orWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    marginBottom: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.line,
  },
  orText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink3,
    letterSpacing: 0.3,
  },

  // ── Google button ──
  googleBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  googleBtnPressed: {
    backgroundColor: Colors.vioSoft,
    transform: [{ scale: 0.98 }],
  },
  googleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: -0.2,
  },

  // ── Footer ──
  footer: {
    paddingTop: 28,
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

  // ── Inline Send button ──
  sendBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexShrink: 0,
  },
  sendBtnActive: {
    backgroundColor: Colors.vioSoft,
  },
  sendBtnDisabled: {
    backgroundColor: 'transparent',
  },
  sendBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sendBtnTextActive: {
    color: Colors.vioD,
  },
  sendBtnTextDisabled: {
    color: Colors.ink3,
  },

  // ── OTP state ──
  otpContext: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  otpContextText: {
    fontSize: 13,
    color: Colors.ink2,
  },
  otpContextPhone: {
    fontWeight: '700',
    color: Colors.ink,
  },
  changeLink: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.vioD,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 6,
  },
  otpBox: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    textAlign: 'center',
    elevation: 1,
  },
  otpBoxFocused: {
    borderColor: Colors.vio,
    shadowColor: Colors.vio,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  otpBoxError: {
    borderColor: '#D9304F',
    backgroundColor: '#FFF4F8',
  },

  // ── Verified state ──
  verifiedRow: {
    height: 54,
    borderRadius: 18,
    backgroundColor: Colors.mintSoft,
    borderWidth: 1.5,
    borderColor: Colors.mint,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 10,
  },
  verifiedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.mintInk,
  },

  // ── Country picker modal ──
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27,22,48,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.page,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(155,123,240,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Colors.ink,
    marginBottom: 4,
  },
  sheetList: {
    paddingBottom: 32,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    gap: 10,
  },
  countryRowActive: {
    backgroundColor: Colors.vioSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginHorizontal: -6,
    borderTopColor: 'transparent',
  },
  rowFlag: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    color: Colors.ink,
  },
  rowCode: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink2,
  },
});
