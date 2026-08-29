/**
 * WaliAccountSetupScreen — shown after "I am a wali" is selected,
 * before Step 1 (code entry).
 *
 * Collects email and password so the wali can create their account.
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={Colors.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <Path d="M1 1l22 22" />
    </Svg>
  ) : (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={Colors.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </Svg>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
interface WaliAccountSetupScreenProps {
  onContinue?: (email: string, password: string) => void;
  onBack?: () => void;
}

// ─── component ────────────────────────────────────────────────────────────────
export function WaliAccountSetupScreen({
  onContinue,
  onBack,
}: WaliAccountSetupScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const canContinue = emailValid && passwordValid;

  const emailError = emailTouched && email.length > 0 && !emailValid;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>

        {/* Nav bar — back button only, no progress bar */}
        <View style={styles.navbar}>
          <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
            <BackIcon />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.heading}>Create your{'\n'}wali account</Text>
            <Text style={styles.subheading}>
              Set up your email and password. You will use these to sign in next time.
            </Text>
          </View>

          {/* Email field */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email address</Text>
            <View style={[styles.inputWrap, emailError && styles.inputWrapError]}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                onBlur={() => setEmailTouched(true)}
                placeholder="e.g. imran@example.com"
                placeholderTextColor={Colors.ink3}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {emailError && (
              <Text style={styles.fieldError}>Enter a valid email address</Text>
            )}
          </View>

          {/* Password field */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={Colors.ink3}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowPassword(v => !v)}
                hitSlop={8}
                style={styles.eyeBtn}>
                <EyeIcon hidden={!showPassword} />
              </Pressable>
            </View>
            {password.length > 0 && !passwordValid && (
              <Text style={styles.fieldHint}>Use at least 8 characters</Text>
            )}
          </View>

          {/* Info note */}
          <View style={styles.infoNote}>
            <Text style={styles.infoText}>
              Your account details are kept private. Only your name and relationship are shown to families.
            </Text>
          </View>

        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            onPress={() => canContinue && onContinue?.(email, password)}
            disabled={!canContinue}
            style={({ pressed }) => ({ opacity: !canContinue ? 0.45 : pressed ? 0.88 : 1 })}>
            <LinearGradient
              colors={[...GRAD]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.continueBtn}>
              <Text style={styles.continueBtnText}>Continue</Text>
            </LinearGradient>
          </Pressable>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.page,
  },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
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

  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },

  header: { marginBottom: 28 },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    color: Colors.ink,
    lineHeight: 36,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 14,
    color: Colors.ink2,
    lineHeight: 21,
  },

  field: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.ink3,
    marginBottom: 8,
  },
  inputWrap: {
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  inputWrapError: {
    borderColor: Colors.roseD,
    backgroundColor: '#FFF6FA',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.ink,
    fontFamily: undefined,
  },
  eyeBtn: {
    paddingLeft: 8,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.roseInk,
    fontWeight: '700',
    marginTop: 6,
  },
  fieldHint: {
    fontSize: 11.5,
    color: Colors.ink3,
    marginTop: 6,
    lineHeight: 16,
  },

  infoNote: {
    backgroundColor: Colors.vioSoft,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12.5,
    color: Colors.vioInk,
    lineHeight: 19,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  continueBtn: {
    height: 54,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.1,
  },
});
