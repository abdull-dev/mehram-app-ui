/**
 * MatchesFoundUnpaidBlock — H12: Matches found, unpaid
 *
 * Shown on HomeScreen when verification is complete, match_pool > 0,
 * and the user has not yet paid.
 *
 *   ┌──────────────────────────────────┐
 *   │  Hero (dark indigo, green dot)   │
 *   │  SEARCH COMPLETE                 │
 *   │  We found 14                     │
 *   │  suitable profiles               │
 *   │  Each one meets your criteria…   │
 *   └──────────────────────────────────┘
 *   ┌──────────────────────────────────┐
 *   │  What we found                   │
 *   │  9   in Lahore, 3 Karachi…       │
 *   │  11  Sunni (Hanafi)              │
 *   │  12  bachelor's degree or above  │
 *   │  8   have a wali registered      │
 *   │  24–29  age range                │
 *   └──────────────────────────────────┘
 *   ┌──────────────────────────────────┐
 *   │  Unlock your introductions       │
 *   │  You'll receive up to three…     │
 *   │  PKR 4,500 · one payment         │
 *   │  [Become a member]               │
 *   │  🛡 No wali-approved intro…      │
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
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/colors';
import { GRADIENT_FILL } from '../../theme/layout';

// ─── gradients ────────────────────────────────────────────────────────────────
const HERO_GRADIENT = ['#5F55A8', '#3E3776', '#2B2653'] as const;
const PAY_GRADIENT  = ['#3E3776', '#2B2653'] as const;
const ROSE_GRADIENT = ['#F2559A', '#E6396E'] as const;

// ─── icons ────────────────────────────────────────────────────────────────────
function ShieldIcon({ size = 14, color = '#9F94D0' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── stat row ─────────────────────────────────────────────────────────────────
interface StatRowProps {
  value: string;
  label: string;
  first?: boolean;
}

function StatRow({ value, label, first = false }: StatRowProps) {
  return (
    <View style={[styles.statRow, !first && styles.statRowBorder]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
interface MatchesFoundUnpaidBlockProps {
  /** Number of matched profiles to display in the hero */
  matchCount?: number;
  /** Primary CTA — navigate to payment screen */
  onBecomeAMember?: () => void;
  userName?: string;
  /** Google Play's localised price; falls back to the static figure. */
  priceLabel?: string | null;
}

export function MatchesFoundUnpaidBlock({
  matchCount = 14,
  onBecomeAMember,
  userName = '',
  priceLabel,
}: MatchesFoundUnpaidBlockProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 16, 32),
            paddingBottom: Math.max(insets.bottom + 100, 110),
          },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ── Greeting header ───────────────────────────────────────── */}
        {userName ? (
          <View style={styles.hdr}>
            <Text style={styles.hdrSalam}>Assalamu alaikum</Text>
            <Text style={styles.hdrName}>{userName}</Text>
          </View>
        ) : null}

        {/* ── Hero card ─────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <LinearGradient
          colors={[...HERO_GRADIENT]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={GRADIENT_FILL}
          pointerEvents="none"
        />

          {/* Green pulse dot + label */}
          <View style={styles.heroTop}>
            <View style={styles.greenpulse} />
            <Text style={styles.heroLabel}>Search Complete</Text>
          </View>

          <Text style={styles.heroHeading}>
            We found {matchCount}{'\n'}suitable profiles
          </Text>

          <Text style={styles.heroPara}>
            Each one meets your criteria, and you meet theirs.
          </Text>
        </View>

        {/* ── What we found card ────────────────────────────────────── */}
        <View style={styles.foundCard}>
          <Text style={styles.foundTitle}>What we found</Text>

          <StatRow first value="9" label="in Lahore, 3 Karachi, 2 overseas" />
          <StatRow value="11" label="Sunni (Hanafi)" />
          <StatRow value="12" label="bachelor's degree or above" />
          <StatRow value="8" label="have a wali registered" />
          <StatRow value="24–29" label="age range" />
        </View>

        {/* ── Payment card ──────────────────────────────────────────── */}
        <View style={styles.payCard}>
          <LinearGradient
          colors={[...PAY_GRADIENT]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={GRADIENT_FILL}
          pointerEvents="none"
        />

          <Text style={styles.payLabel}>Membership</Text>

          <Text style={styles.payHeading}>
            Unlock your{'\n'}introductions
          </Text>

          <Text style={styles.payPara}>
            You'll receive up to three a day, chosen against your criteria.
          </Text>

          {/* Price row */}
          <View style={styles.payPriceRow}>
            <Text style={styles.payPrice}>{priceLabel ?? 'PKR 4,500'}</Text>
            <Text style={styles.payPriceSub}>one payment, no renewal</Text>
          </View>

          {/* CTA button */}
          <Pressable
            onPress={onBecomeAMember}
            style={({ pressed }) => ({
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}>
            <LinearGradient
              colors={[...ROSE_GRADIENT]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.payBtn}>
              <Text style={styles.payBtnText}>Become a member</Text>
            </LinearGradient>
          </Pressable>

          {/* Safety note */}
          <View style={styles.safeRow}>
            <ShieldIcon size={14} color="#9F94D0" />
            <Text style={styles.safeText}>
              No wali-approved introduction within 90 days and you are refunded in full.
            </Text>
          </View>
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

  hdr: { paddingHorizontal: 4, paddingTop: 11, paddingBottom: 13 },
  hdrSalam: { fontSize: 13.5, color: '#9695A5' },
  hdrName: { fontSize: 25, fontWeight: '700', letterSpacing: -0.6, color: '#17171F', marginTop: 1 },

  // ── Hero card ──────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 20,
    padding: 20,
      // Clips the background gradient to the rounded corners. The View
    // itself is sized by its content, so the content is never clipped.
    overflow: 'hidden',
},

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },

  // Green pulse dot (search complete = positive)
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

  // ── What we found card ─────────────────────────────────────────────────────
  foundCard: {
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

  foundTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Colors.ink,
    marginBottom: 4,
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingVertical: 11,
  },

  statRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },

  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: -0.3,
    minWidth: 42,
  },

  statLabel: {
    fontSize: 13,
    color: Colors.ink2,
    flex: 1,
    lineHeight: 19,
  },

  // ── Payment card ──────────────────────────────────────────────────────────
  payCard: {
    borderRadius: 20,
    padding: 20,
      // Clips the background gradient to the rounded corners. The View
    // itself is sized by its content, so the content is never clipped.
    overflow: 'hidden',
},

  payLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: Colors.rose,
    marginBottom: 8,
  },

  payHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 24,
  },

  payPara: {
    fontSize: 12.5,
    lineHeight: 20,
    color: '#B9AFE2',
    marginTop: 8,
  },

  payPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },

  payPrice: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.7,
  },

  payPriceSub: {
    fontSize: 12,
    color: '#9F94D0',
  },

  payBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  payBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#fff',
  },

  safeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
  },

  safeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: '#9F94D0',
  },
});
