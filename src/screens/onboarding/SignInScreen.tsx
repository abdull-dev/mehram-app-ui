/**
 * SignInScreen
 *
 * Sign-in screen for returning users (email/phone + password).
 * Matches the Mehram design system (PhoneScreen pattern).
 *
 *   ┌─────────────────────────────────┐
 *   │  ← [====0%===================]  │  NavBar
 *   ├─────────────────────────────────┤
 *   │  Welcome back                   │  kicker pill
 *   │  Sign in to                     │
 *   │  Mehram                         │
 *   │  Use the same method you…       │
 *   │  EMAIL OR PHONE  [field]        │
 *   │  PASSWORD        [field]        │
 *   ├─────────────────────────────────┤
 *   │  [Sign in]                      │
 *   │  ─── or ───                     │
 *   │  [G  Continue with Google]      │
 *   │  New here? Create an account    │
 *   └─────────────────────────────────┘
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
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
import { login } from '../../api/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';

// ─── animation constants ──────────────────────────────────────────────────────

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

function EnvelopeIcon() {
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

function LockIcon() {
  return (
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
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      {visible ? (
        <>
          <Path
            d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
            stroke={Colors.ink3}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
            stroke={Colors.ink3}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M1 1l22 22"
            stroke={Colors.ink3}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <Path
            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
            stroke={Colors.ink3}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
            stroke={Colors.ink3}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </>
      )}
    </Svg>
  );
}

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

interface SignInScreenProps {
  onBack?: () => void;
  /** Called after successful login with tokens already saved */
  onSignIn?: (email: string, password: string, emailVerified: boolean) => void;
  onGoogleSignIn?: () => void;
  onCreateAccount?: () => void;
}

export function SignInScreen({
  onBack,
  onSignIn,
  onGoogleSignIn,
  onCreateAccount,
}: SignInScreenProps) {
  const insets = useSafeAreaInsets();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // ── Staggered entrance animations ──────────────────────────────────────────
  const question = useFadeRise(70);
  const identifierField = useFadeRise(150);
  const passwordField = useFadeRise(230);
  const footer = useFadeRise(310);

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
      makeRise(identifierField),
      makeRise(passwordField),
      makeRise(footer),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const e: typeof errors = {};
    if (!identifier.trim()) {
      e.identifier = 'Please enter your email or phone number.';
    }
    if (!password) {
      e.password = 'Please enter your password.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Sign-in handler ────────────────────────────────────────────────────────

  async function handleSignIn() {
    if (!validate() || loading) return;
    setLoading(true);
    try {
      const result = await login({ email: identifier.trim().toLowerCase(), password });
      onSignIn?.(identifier, password, result.user.emailVerified);
    } catch (err: any) {
      const msg: string = err?.message ?? 'Invalid credentials. Please try again.';
      setErrors(e => ({ ...e, identifier: msg }));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !loading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 16),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── NavBar ─────────────────────────────────────────────────── */}
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

          {/* ── Heading section ───────────────────────────────────────── */}
          <Animated.View style={[styles.qSection, riseStyle(question.anim)]}>
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>Welcome back</Text>
            </View>
            <Text style={styles.heading}>{'Sign in to\nMehram'}</Text>
            <Text style={styles.subtitle}>
              Use the same method you signed up with.
            </Text>
          </Animated.View>

          {/* ── Email / Phone field ───────────────────────────────────── */}
          <Animated.View style={[styles.fieldWrap, riseStyle(identifierField.anim)]}>
            <Text style={styles.fieldLabel}>Email or Phone</Text>
            <Pressable
              style={[styles.inputRow, errors.identifier ? styles.inputRowError : null]}
              onPress={() => identifierRef.current?.focus()}>
              <EnvelopeIcon />
              <TextInput
                ref={identifierRef}
                style={styles.textInput}
                value={identifier}
                onChangeText={v => {
                  setIdentifier(v);
                  if (errors.identifier) setErrors(e => ({ ...e, identifier: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="email or phone number"
                placeholderTextColor={Colors.ink3}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </Pressable>
            {errors.identifier ? (
              <Text style={styles.errorText}>{errors.identifier}</Text>
            ) : null}
          </Animated.View>

          {/* ── Password field ────────────────────────────────────────── */}
          <Animated.View style={[styles.fieldWrap, riseStyle(passwordField.anim)]}>
            <Text style={styles.fieldLabel}>Password</Text>
            <Pressable
              style={[styles.inputRow, errors.password ? styles.inputRowError : null]}
              onPress={() => passwordRef.current?.focus()}>
              <LockIcon />
              <TextInput
                ref={passwordRef}
                style={styles.textInput}
                value={password}
                onChangeText={v => {
                  setPassword(v);
                  if (errors.password) setErrors(e => ({ ...e, password: undefined }));
                }}
                secureTextEntry={!showPassword}
                placeholder="Your password"
                placeholderTextColor={Colors.ink3}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
              />
              <Pressable onPress={() => setShowPassword(s => !s)} hitSlop={8}>
                <EyeIcon visible={showPassword} />
              </Pressable>
            </Pressable>
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </Animated.View>

          {/* ── Footer (sign-in + divider + Google + create account) ───── */}
          <Animated.View style={[styles.footer, riseStyle(footer.anim)]}>
            <GradientButton
              label="Sign in"
              variant={canSubmit ? 'primary' : 'disabled'}
              onPress={handleSignIn}
              loading={loading}
            />

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

            <TouchableOpacity
              onPress={onCreateAccount}
              style={styles.createAccountBtn}
              activeOpacity={0.7}>
              <Text style={styles.createAccountText}>
                New here?{' '}
                <Text style={styles.createAccountBold}>Create an account</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 40,
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
    width: '0%',
    height: '100%',
    borderRadius: 5,
  },

  // ── Heading section ──
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
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.ink,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 11.5,
    color: '#D9304F',
    marginTop: 7,
    lineHeight: 17,
  },

  // ── Footer ──
  footer: {
    paddingTop: 28,
    paddingBottom: 8,
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

  // ── Create account link ──
  createAccountBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  createAccountText: {
    fontSize: 13,
    color: Colors.ink2,
  },
  createAccountBold: {
    fontWeight: '700',
    color: Colors.vioD,
  },
});
