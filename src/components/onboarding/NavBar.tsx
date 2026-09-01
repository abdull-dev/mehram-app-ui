/**
 * NavBar  (shared across F3-F16+)
 *
 * Mirrors the HTML prototype's .nb layout:
 *
 *   [←]  [========progress========]  Save?
 *
 *   - Back button: white card, violet chevron, subtle shadow
 *   - Progress track: violet-tint background, gradient fill
 *   - Optional skip label: violet-d, 700 weight
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Colors, GradientColors } from '../../theme/colors';
import { OnboardingExit } from '../ui/OnboardingExit';

interface NavBarProps {
  /** 0–100 percentage fill for the progress bar */
  progress: number;
  onBack?: () => void;
  /** Optional right-side text, e.g. "Save" or "Skip" */
  skipLabel?: string;
  onSkip?: () => void;
  /**
   * How to leave the flow — an ✕ back to Home, or "Log out" during signup.
   * Takes the place of both the back button and the skip label; see
   * `OnboardingExit`.
   */
  onClose?: () => void;
  onLogout?: () => void;
}

export function NavBar({ progress, onBack, skipLabel, onSkip, onClose, onLogout }: NavBarProps) {
  return (
    <View style={styles.container}>
      {/* Back button — .back. Hidden alongside an exit: a screen entered
          deliberately needs one way out, not two competing controls. */}
      {!onClose && !onLogout && (
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.back,
          pressed && { transform: [{ scale: 0.92 }] },
        ]}>
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 18l-6-6 6-6"
            stroke="#3E2A73"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      )}

      {/* Progress track — .prg */}
      <View style={styles.track}>
        <LinearGradient
          colors={[...GradientColors.primary]}
          locations={[...GradientColors.primaryLocations]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.fill, { width: `${Math.min(100, Math.max(0, progress))}%` }]}
        />
      </View>

      {/* The exit when there is one, otherwise the skip / save label. */}
      {onClose || onLogout ? (
        <OnboardingExit onClose={onClose} onLogout={onLogout} />
      ) : skipLabel && onSkip ? (
        /* Both required: the label used to render on its own, which is how five
           screens showed a "Save" button wired to nothing. */
        <Pressable onPress={onSkip}>
          <Text style={styles.skip}>{skipLabel}</Text>
        </Pressable>
      ) : (
        // Spacer so the progress bar keeps a consistent width even without a label
        <View style={styles.skipSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // .nb — flexDirection row, align-items center, gap 12, padding 12 0 4
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
    flexShrink: 0,
  },

  // .back — 38×38, radius 14, white 92%, violet shadow
  back: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  // .prg — flex 1, height 7, radius 5, violet-16% bg
  track: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },

  // .prg i — full height, gradient, radius 5
  fill: {
    height: '100%',
    borderRadius: 5,
  },

  // .skip — 12.5px 700, violet-d
  skip: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioD,
  },

  skipSpacer: {
    width: 32,
  },
});
