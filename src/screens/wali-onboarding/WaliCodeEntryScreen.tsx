/**
 * WaliCodeEntryScreen — W2
 *
 * Alphanumeric invite code entry.
 * Progress bar at 25% — "Step 1 of 3".
 * "Codes last 7 days" gold banner.
 *
 * Length tracks the server's INVITE_CODE_PATTERN (/^[A-Za-z0-9]{6,16}$/).
 */

import React, { useRef, useState } from 'react';
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
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, GRAD } from '../../theme/colors';

// Every code the generator issues is exactly this long, so the field is a fixed
// row of six and refuses a seventh character. The server still accepts 6-16 for
// invites minted by earlier generators; those are not typeable here by design,
// because letting the row grow made a predictive keyboard's autocorrect spill
// whole words into the field.
const CODE_LENGTH = 6;

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vioInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={Colors.goldInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
interface WaliCodeEntryScreenProps {
  onBack?: () => void;
  /** Called when user taps Create account — verifies code and registers */
  onVerify?: (code: string) => void;
  loading?: boolean;
  error?: string;
}

// ─── component ────────────────────────────────────────────────────────────────
export function WaliCodeEntryScreen({
  onBack,
  onVerify,
  loading = false,
  error,
}: WaliCodeEntryScreenProps) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const isReady = code.length === CODE_LENGTH && !loading;

  function handleChange(text: string) {
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH);
    setCode(cleaned);
    if (cleaned.length === CODE_LENGTH) {
      inputRef.current?.blur();
    }
  }

  function renderBoxes() {
    return Array.from({ length: CODE_LENGTH }).map((_, i) => {
      const char = code[i] ?? '';
      const focused = i === code.length && code.length < CODE_LENGTH;
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
      </View>

      <View style={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Enter the code{'\n'}Your Dependent gave you</Text>
          <Text style={styles.subheading}>Six characters. Your Dependent can read it to you over the phone.</Text>
        </View>

        {/* OTP boxes — tapping focuses the hidden input */}
        {/* OTP boxes + invisible full-cover input (enables paste context menu) */}
        <View style={[styles.otpContainer, loading && { opacity: 0.5 }]}>
          <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
            {renderBoxes()}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleChange}
            keyboardType="visible-password"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
            maxLength={CODE_LENGTH}
            style={styles.hiddenInput}
            editable={!loading}
          />
        </View>

        {/* Verifying loader */}
        {loading ? (
          <View style={styles.loaderRow}>
            {/* Fixed box: an ActivityIndicator has no dependable intrinsic size
                inside a row here, and collapsed to a clipped sliver without one. */}
            <View style={styles.loaderSpinner}>
              <ActivityIndicator size="small" color={Colors.vio} />
            </View>
            <Text style={styles.loaderText}>Verifying…</Text>
          </View>
        ) : null}

        {/* Inline error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Gold banner */}
        <View style={styles.banner}>
          <ClockIcon />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Codes last 7 days</Text>
            <Text style={styles.bannerBody}>If yours has expired, ask her to send a new one.</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={() => isReady && onVerify?.(code)}
          style={({ pressed }) => [{ opacity: pressed && isReady ? 0.9 : 1 }]}>
          {isReady ? (
            <LinearGradient
              colors={[...GRAD]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.btnFilled}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnFilledText}>Create account</Text>}
            </LinearGradient>
          ) : (
            <View style={[styles.btnFilled, styles.btnDisabled]}>
              <Text style={styles.btnDisabledText}>Create account</Text>
            </View>
          )}
        </Pressable>
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
  otpContainer: {
    marginTop: 16,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    // Android ignores shadow* entirely, so the focus glow existed only on iOS.
    // `elevation` is the Android equivalent, matching AccountVerificationScreen's
    // focused OTP box.
    elevation: 3,
  },
  otpChar: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
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
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.goldSoft,
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.goldInk,
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#8A6410',
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
