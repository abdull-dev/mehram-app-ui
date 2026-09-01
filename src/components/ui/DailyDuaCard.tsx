/**
 * DailyDuaCard
 *
 * Dark indigo gradient card showing a daily Islamic dua.
 * Appears below "While you wait" sections on waiting/empty states.
 *
 *   ┌────────────────────────────────────┐
 *   │  ● Daily Dua                       │
 *   │                                    │
 *   │  "Our Lord, grant us from among    │
 *   │   our spouses and offspring        │
 *   │   comfort to our eyes."            │
 *   │                                    │
 *   │  SURAH AL-FURQAN · 25:74           │
 *   └────────────────────────────────────┘
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { GRADIENT_FILL } from '../../theme/layout';

const DUAS = [
  {
    text: '"Our Lord, grant us from among our spouses and offspring comfort to our eyes."',
    source: 'SURAH AL-FURQAN · 25:74',
  },
  {
    text: '"Our Lord, pour upon us patience and let us die as Muslims."',
    source: 'SURAH AL-ARAF · 7:126',
  },
  {
    text: '"My Lord, build for me near You a house in Paradise."',
    source: 'SURAH AT-TAHRIM · 66:11',
  },
  {
    text: '"Our Lord, make us grateful to You and accepting of Your decree."',
    source: 'HADITH · TIRMIDHI',
  },
];

interface DailyDuaCardProps {
  /** Index into the duas array — defaults to 0 (today's dua) */
  index?: number;
}

export function DailyDuaCard({ index = 0 }: DailyDuaCardProps) {
  const dua = DUAS[index % DUAS.length];

  return (
    <View style={styles.card}>
      <LinearGradient
      colors={['#3E3776', '#2B2653']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={GRADIENT_FILL}
      pointerEvents="none"
    />
      {/* Label row */}
      <View style={styles.labelRow}>
        <View style={styles.labelDot} />
        <Text style={styles.labelText}>Daily Dua</Text>
      </View>

      {/* Quote */}
      <Text style={styles.quote}>{dua.text}</Text>

      {/* Source */}
      <Text style={styles.source}>{dua.source}</Text>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 20,
    marginBottom: 12,
      // Clips the background gradient to the rounded corners. The View
    // itself is sized by its content, so the content is never clipped.
    overflow: 'hidden',
},
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E6396E',
  },
  labelText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E6396E',
    letterSpacing: 0.3,
  },
  quote: {
    fontSize: 15,
    lineHeight: 24,
    color: '#fff',
    fontWeight: '500',
  },
  source: {
    fontSize: 11,
    color: '#8F86BC',
    marginTop: 12,
    letterSpacing: 1,
    fontWeight: '600',
  },
});
