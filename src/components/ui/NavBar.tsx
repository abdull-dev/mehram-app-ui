/**
 * NavBar
 *
 * Shared navigation bar matching the .nb layout from the HTML prototype:
 *
 *   [← back]  [━━━━━━━━━━━━━━  progress  ━━━━]  [action]
 *
 * - Back button: white rounded square, back chevron SVG
 * - Progress: gradient fill, 7 px track
 * - Optional right-side action label (e.g. "Save", "Skip")
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Colors, GradientColors } from '../../theme/colors';

interface NavBarProps {
  /** 0–100 */
  progress: number;
  onBack?: () => void;
  /** Label shown on the right (e.g. "Save", "Skip"). Omit to hide. */
  actionLabel?: string;
  onAction?: () => void;
}

export function NavBar({ progress, onBack, actionLabel, onAction }: NavBarProps) {
  const pct = `${Math.min(100, Math.max(0, progress))}%`;

  return (
    <View style={styles.nb}>
      {/* Back button */}
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.back, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
        <Svg
          width={17}
          height={17}
          viewBox="0 0 24 24"
          fill="none"
          stroke={Colors.vioInk}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
      </Pressable>

      {/* Progress track */}
      <View style={styles.track}>
        <LinearGradient
          colors={[...GradientColors.primary]}
          locations={[...GradientColors.primaryLocations]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.fill, { width: pct }]}
        />
      </View>

      {/* Optional right action */}
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // .nb — flex row, gap 12, padding 12 0 4
  nb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },

  // .back — 38×38, rounded 14, white 92%, subtle shadow
  back: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },

  // .prg — flex:1, height 7, rounded 5, violet-tint bg
  track: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },

  // .prg i — gradient fill, full height
  fill: {
    height: '100%',
    borderRadius: 5,
  },

  // .skip — 12.5 700, vioD
  action: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioD,
  },
});
