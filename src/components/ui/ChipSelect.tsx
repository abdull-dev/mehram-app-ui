/**
 * ChipSelect
 *
 * Single-select pill/chip row matching .chipwrap + .chip + .chip.on from the prototype:
 *
 *   LABEL
 *   [Chip A]  [Chip B ✓]  [Chip C]
 *   hint text (optional)
 *
 * Selected chip gets the primary gradient fill; unselected chips are white
 * with a subtle violet border.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, GradientColors } from '../../theme/colors';

interface ChipSelectProps {
  label: string;
  options: string[];
  /** Index of the selected option */
  value: number;
  onChange: (index: number) => void;
  hint?: string;
}

export function ChipSelect({ label, options, value, onChange, hint }: ChipSelectProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.flab}>{label}</Text>
      <View style={styles.chipwrap}>
        {options.map((option, i) => {
          const isOn = i === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(i)}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
              {isOn ? (
                <LinearGradient
                  colors={[...GradientColors.primary]}
                  locations={[...GradientColors.primaryLocations]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.chip, styles.chipOn]}>
                  <Text style={styles.chipOnText}>{option}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{option}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={styles.fhint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // .field — margin-top 14
  field: {
    marginTop: 14,
  },

  // .flab — 11px 800, letter-spacing .8, uppercase, ink3
  flab: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.ink3,
    marginBottom: 8,
  },

  // .chipwrap — flex-wrap row, gap 8
  chipwrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // .chip base — padding 11 14, rounded 15, white 90%, violet border, subtle shadow
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 9,
    elevation: 2,
  },

  // .chip.on — no border, coloured glow
  chipOn: {
    borderWidth: 0,
    shadowColor: '#B464C8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },

  // Default chip text — 13.5px 700 ink2
  chipText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink2,
  },

  // Selected chip text — white
  chipOnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#fff',
  },

  // .fhint — 11.5px ink3, margin-top 7, line-height 1.45
  fhint: {
    fontSize: 11.5,
    color: Colors.ink3,
    marginTop: 7,
    lineHeight: 17,
  },
});
