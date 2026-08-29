/**
 * WaliWelcomeScreen — W1
 *
 * Full-screen welcome shown when the wali arrives from the invitation link.
 * "Sana has asked you to be her wali"
 *
 * Orbit animation: outer dashed spinning ring + floating core with person icon.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, GRAD } from '../../theme/colors';

// ─── icons ────────────────────────────────────────────────────────────────────
function PersonIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={3.5} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </Svg>
  );
}

// ─── orbit hero ───────────────────────────────────────────────────────────────
function OrbitHero() {
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Outer ring: slow clockwise rotation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 26_000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Core: gentle float up and down
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2_300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2_300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [spinAnim, floatAnim]);

  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={orb.container}>
      {/* Outer dashed ring — rotates */}
      <Animated.View style={[orb.ring, { transform: [{ rotate: spinDeg }] }]} />

      {/* Static inner ring */}
      <View style={orb.ring2} />

      {/* Floating satellite dots */}
      <Animated.View style={[orb.ring, { transform: [{ rotate: spinDeg }] }]}>
        <View style={[orb.sat, { top: 2, left: 64 }]} />
        <View style={[orb.sat, orb.satSmall, { bottom: 14, left: 16 }]} />
      </Animated.View>

      {/* Floating core */}
      <Animated.View style={[orb.coreWrap, { transform: [{ translateY: floatAnim }] }]}>
        <LinearGradient
          colors={['#A98CF5', '#6E4FD6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={orb.core}>
          <PersonIcon />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const orb = StyleSheet.create({
  container: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 75,
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.42)',
    borderStyle: 'dashed',
  },
  ring2: {
    position: 'absolute',
    top: 15, left: 15, right: 15, bottom: 15,
    borderRadius: 60,
    borderWidth: 1.4,
    borderColor: 'rgba(155,123,240,0.16)',
  },
  sat: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#9B7BF0',
  },
  satSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.75,
  },
  coreWrap: {
    position: 'absolute',
    top: 29, left: 29, right: 29, bottom: 29,
    borderRadius: 46,
    shadowColor: '#BE5AB4',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 20,
    elevation: 8,
  },
  core: {
    flex: 1,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── props ────────────────────────────────────────────────────────────────────
interface WaliWelcomeScreenProps {
  dependentName?: string;
  onContinue?: () => void;
  onLearnMore?: () => void;
}

// ─── component ────────────────────────────────────────────────────────────────
export function WaliWelcomeScreen({
  dependentName = 'Sana',
  onContinue,
  onLearnMore,
}: WaliWelcomeScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      {/* Central welcome area */}
      <View style={styles.welcome}>
        <OrbitHero />

        <Text style={styles.heading}>
          {dependentName} has asked{'\n'}you to be her wali
        </Text>

        <Text style={styles.para}>
          She is using Mehram to find a rishta. Proposals will come to you before they reach
          her, and you will be able to read every conversation.
        </Text>
      </View>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <LinearGradient
            colors={[...GRAD]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.btnFilled}>
            <Text style={styles.btnFilledText}>Continue</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={onLearnMore}
          style={({ pressed }) => [styles.btnGhost, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.btnGhostText}>What does this involve?</Text>
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
  heading: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 33,
    textAlign: 'center',
    color: Colors.ink,
    marginBottom: 13,
  },
  para: {
    fontSize: 14,
    color: Colors.ink2,
    lineHeight: 22.7,
    textAlign: 'center',
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
