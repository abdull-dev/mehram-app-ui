/**
 * WaliCodeEntryScreen — W2
 *
 * Six-digit OTP code entry.
 * Progress bar at 25% — "Step 1 of 3".
 * "Codes last 7 days" gold banner.
 * Continue is disabled until 6 digits.
 */

import React, { useRef, useState } from 'react';
import {
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
  onContinue?: (code: string) => void;
  onBack?: () => void;
  onUseLink?: () => void;
}

// ─── component ────────────────────────────────────────────────────────────────
export function WaliCodeEntryScreen({
  onContinue,
  onBack,
  onUseLink,
}: WaliCodeEntryScreenProps) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);
  const isReady = code.length === 6;

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) {
      inputRef.current?.blur();
    }
  }

  // Render 6 boxes showing each digit
  function renderBoxes() {
    return Array.from({ length: 6 }).map((_, i) => {
      const char = code[i] ?? '';
      const focused = i === code.length && code.length < 6;
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
            <Text style={styles.stepText}>Step 1 of 3</Text>
          </View>
          <Text style={styles.heading}>Enter the code{'\n'}she gave you</Text>
          <Text style={styles.subheading}>Six digits. She can read it to you over the phone.</Text>
        </View>

        {/* OTP boxes — tapping focuses the hidden input */}
        <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
          {renderBoxes()}
        </Pressable>

        {/* Hidden TextInput that captures actual input */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.hiddenInput}
          caretHidden
        />

        {/* Gold banner */}
        <View style={styles.banner}>
          <ClockIcon />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Codes last 7 days</Text>
            <Text style={styles.bannerBody}>If yours has expired, ask her to send a new one.</Text>
          </View>
        </View>
      </View>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <Pressable
          onPress={() => isReady && onContinue?.(code)}
          style={({ pressed }) => [{ opacity: pressed && isReady ? 0.9 : 1 }]}>
          {isReady ? (
            <LinearGradient
              colors={[...GRAD]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.btnFilled}>
              <Text style={styles.btnFilledText}>Continue</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.btnFilled, styles.btnDisabled]}>
              <Text style={styles.btnDisabledText}>Continue</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={onUseLink}
          style={({ pressed }) => [styles.btnGhost, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.btnGhostText}>I have a link instead</Text>
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
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '25%',
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
  btnGhost: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink2,
  },
});
