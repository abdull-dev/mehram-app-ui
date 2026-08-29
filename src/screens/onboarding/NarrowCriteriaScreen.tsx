/**
 * NarrowCriteriaScreen  (H11)
 *
 * Opened from the Home filter icon or from F13 when criteria are too narrow.
 * Shows the user's active search status with criteria suggestions and lets
 * them keep their current filters or adjust them.
 *
 *   ┌──────────────────────────────────┐
 *   │  Assalamu alaikum / Name          │
 *   └──────────────────────────────────┘
 *   ┌──────────────────────────────────┐  ← indigo hero
 *   │  ● SEARCH ACTIVE                 │
 *   │  Fine-tune your search           │
 *   │  Each adjustment below adds…     │
 *   └──────────────────────────────────┘
 *   ┌──────────────────────────────────┐  ← white suggestions card
 *   │  Suggestions                     │
 *   │  Age range 24–34 → 24–36  [+5]  │
 *   │  Add Karachi              [+3]   │
 *   │  Add Islamabad            [+2]   │
 *   │  Any Sunni school         [+4]   │
 *   │  Bachelor's → any degree  [+6]  │
 *   └──────────────────────────────────┘
 *   [Keep as is]  [Adjust]
 *   ┌──────────────────────────────────┐  ← amber banner
 *   │  Keeping your criteria is fine   │
 *   │  We'll keep searching daily…     │
 *   └──────────────────────────────────┘
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../../theme/colors';
import { FilterValues } from '../home/AdjustFiltersScreen';

// ─── gradients ────────────────────────────────────────────────────────────────
const HERO_GRADIENT = ['#5F55A8', '#3E3776', '#2B2653'] as const;
const ROSE_GRADIENT = ['#F2559A', '#E6396E'] as const;

// ─── filter row ───────────────────────────────────────────────────────────────
interface FilterRowProps {
  label: string;
  value: string;
  first?: boolean;
}

function FilterRow({ label, value, first = false }: FilterRowProps) {
  return (
    <View style={[styles.suggRow, !first && styles.suggRowBorder]}>
      <Text style={styles.suggLabel}>{label}</Text>
      <View style={styles.suggBadge}>
        <Text style={styles.suggBadgeText}>{value}</Text>
      </View>
    </View>
  );
}

// ─── derive display rows from FilterValues ────────────────────────────────────
function filtersToRows(f: FilterValues): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  rows.push({ label: 'Age range', value: `${f.ageMin}–${f.ageMax}` });

  if (f.heightMinCm !== null || f.heightMaxCm !== null) {
    rows.push({ label: 'Height', value: `${f.heightMinCm ?? 140}–${f.heightMaxCm ?? 220} cm` });
  }

  const cityValue =
    f.cities.length <= 2
      ? f.cities.join(', ')
      : `${f.cities.slice(0, 2).join(', ')} +${f.cities.length - 2} more`;
  rows.push({ label: 'Cities', value: cityValue });

  if (f.includeOverseas) {
    rows.push({ label: 'Overseas', value: 'Included' });
  }

  rows.push({ label: 'Sect', value: f.sects.join(', ') });

  rows.push({ label: 'Min religiosity', value: f.minReligiosity });

  rows.push({ label: 'Education', value: f.educationLevels.join(', ') });

  rows.push({ label: 'Marital status', value: f.maritalStatuses.join(', ') });

  return rows;
}

// ─── component ────────────────────────────────────────────────────────────────
interface NarrowCriteriaScreenProps {
  /** User's first name for the greeting */
  userName?: string;
  /** The user's currently applied filters — rendered as a summary card */
  filters?: FilterValues;
  /** Called when user taps "Adjust" → navigate to Preferences */
  onWidenCriteria?: () => void;
  /** Called when user taps "Keep as is" → continue forward */
  onKeepCriteria?: () => void;
}

export function NarrowCriteriaScreen({
  userName = '',
  filters,
  onWidenCriteria,
  onKeepCriteria,
}: NarrowCriteriaScreenProps) {
  const filterRows = filters ? filtersToRows(filters) : [];
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Greeting (fixed, does not scroll) ─────────────────────────── */}
      {userName ? (
        <View style={[styles.hdr, { paddingTop: Math.max(insets.top + 16, 32) }]}>
          <Text style={styles.hdrSalam}>Assalamu alaikum</Text>
          <Text style={styles.hdrName}>{userName}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 16, 32) },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero card (indigo) ────────────────────────────────────────── */}
        <LinearGradient
          colors={[...HERO_GRADIENT]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={styles.heroCard}>

          <View style={styles.heroTop}>
            <View style={styles.greenpulse} />
            <Text style={styles.heroLabel}>Search Active</Text>
          </View>

          <Text style={styles.heroHeading}>Fine-tune your{'\n'}search</Text>

          <Text style={styles.heroPara}>
            Each adjustment below adds more profiles to your daily introductions.
          </Text>
        </LinearGradient>

        {/* ── Applied filters card ──────────────────────────────────────── */}
        {filterRows.length > 0 ? (
          <View style={styles.sugCard}>
            <Text style={styles.sugTitle}>Applied filters</Text>
            {filterRows.map((row, i) => (
              <FilterRow key={i} first={i === 0} label={row.label} value={row.value} />
            ))}
          </View>
        ) : null}

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <View style={styles.btnRow}>
          <Pressable
            onPress={onKeepCriteria}
            style={({ pressed }) => [styles.keepBtn, pressed && { opacity: 0.7 }]}>
            <Text style={styles.keepBtnText}>Keep as is</Text>
          </Pressable>

          <Pressable
            onPress={onWidenCriteria}
            style={({ pressed }) => [styles.adjustWrapper, pressed && { opacity: 0.88 }]}>
            <LinearGradient
              colors={[...ROSE_GRADIENT]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.adjustBtn}>
              <Text style={styles.adjustBtnText}>Adjust</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── Amber info banner ─────────────────────────────────────────── */}
        <View style={styles.amberBanner}>
          <Text style={styles.amberTitle}>Keeping your criteria is fine</Text>
          <Text style={styles.amberBody}>
            We'll keep searching daily and tell you the moment someone fits.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.page,
  },

  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },

  // ── Greeting ──────────────────────────────────────────────────────────────
  hdr: { paddingHorizontal: 20, paddingBottom: 13 },
  hdrSalam: { fontSize: 13.5, color: '#9695A5' },
  hdrName: { fontSize: 25, fontWeight: '700', letterSpacing: -0.6, color: '#17171F', marginTop: 1 },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 20,
    padding: 20,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },

  greenpulse: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#3FCF9A',
    shadowColor: '#3FCF9A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 2,
  },

  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#CFC4F5',
  },

  heroHeading: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 33,
    color: '#fff',
    marginBottom: 10,
  },

  heroPara: {
    fontSize: 13,
    color: '#CBC1EE',
    lineHeight: 21,
  },

  // ── Suggestions card ──────────────────────────────────────────────────────
  sugCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 19,
    paddingTop: 17,
    paddingBottom: 6,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2,
  },

  sugTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Colors.ink,
    marginBottom: 4,
  },

  suggRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },

  suggRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },

  suggLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 19,
  },

  suggBadge: {
    backgroundColor: '#EEF0FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  suggBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#5249A0',
    letterSpacing: -0.1,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },

  keepBtn: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  keepBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.ink2,
  },

  adjustWrapper: {
    flex: 1,
  },

  adjustBtn: {
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  adjustBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Amber banner ──────────────────────────────────────────────────────────
  amberBanner: {
    backgroundColor: '#FFF8E6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5D87A',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  amberTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A6A00',
    marginBottom: 4,
  },

  amberBody: {
    fontSize: 12.5,
    color: '#A07A00',
    lineHeight: 19,
  },
});
