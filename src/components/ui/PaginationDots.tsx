/**
 * PaginationDots
 *
 * Mirrors the .dots / .dt / .dt.on pattern from the HTML prototype.
 *
 * Active dot: 24 × 7 pill with the primary gradient.
 * Inactive dot: 7 × 7 circle, muted violet.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { GradientColors } from '../../theme/colors';

interface PaginationDotsProps {
  total: number;
  active: number;
}

export function PaginationDots({ total, active }: PaginationDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) =>
        i === active ? (
          <LinearGradient
            key={i}
            colors={[...GradientColors.primary]}
            locations={[...GradientColors.primaryLocations]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.dotActive}
          />
        ) : (
          <View key={i} style={styles.dot} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(155,123,240,0.28)',
  },
  dotActive: {
    width: 24,
    height: 7,
    borderRadius: 4,
  },
});
