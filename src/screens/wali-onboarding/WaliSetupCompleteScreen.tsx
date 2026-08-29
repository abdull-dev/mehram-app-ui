/**
 * WaliSetupCompleteScreen — W6
 *
 * "You are Sana's wali" — animated checkmark circle, two action buttons.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Colors, GRAD } from '../../theme/colors';

// ─── animated checkmark ───────────────────────────────────────────────────────
function CheckCircle() {
  const scaleAnim = useRef(new Animated.Value(0.68)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.07,
        duration: 350,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
      <Svg width={38} height={38} viewBox="0 0 24 24" fill="none"
        stroke="#22A87C" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 12.5l5 5 9-10" />
      </Svg>
    </Animated.View>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
interface WaliSetupCompleteScreenProps {
  dependentName?: string;
  onGoHome?: () => void;
  onSeeDependent?: () => void;
}

// ─── component ────────────────────────────────────────────────────────────────
export function WaliSetupCompleteScreen({
  dependentName = 'Sana',
  onGoHome,
  onSeeDependent,
}: WaliSetupCompleteScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      {/* Central content */}
      <View style={styles.welcome}>
        <CheckCircle />

        <Text style={styles.heading}>You are {dependentName}'s wali</Text>

        <Text style={styles.para}>
          She has been told. Proposals will come to you first, and we will notify you the
          moment one arrives.
        </Text>

        {/* "Nothing to review yet" card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nothing to review yet</Text>
          <Text style={styles.cardBody}>
            Her search has just started. We will message you when there is something to look at.
          </Text>
        </View>
      </View>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <Pressable
          onPress={onGoHome}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <LinearGradient
            colors={[...GRAD]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.btnFilled}>
            <Text style={styles.btnFilledText}>Go to my home</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={onSeeDependent}
          style={({ pressed }) => [styles.btnOutline, { opacity: pressed ? 0.8 : 1 }]}>
          <Text style={styles.btnOutlineText}>See what {dependentName} can see</Text>
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
  welcome: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E9FBF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#3FCF9A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 6,
  },
  heading: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 31,
    textAlign: 'center',
    color: Colors.ink,
    marginBottom: 13,
  },
  para: {
    fontSize: 14,
    color: Colors.ink2,
    lineHeight: 22.7,
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    padding: 17,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
    textAlign: 'left',
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: Colors.ink,
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 12.5,
    color: Colors.ink2,
    lineHeight: 19,
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
  btnOutline: {
    height: 54,
    borderRadius: 19,
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.28)',
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  btnOutlineText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.vioInk,
  },
});
