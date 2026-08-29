/**
 * PaymentFailedBlock — H5: Payment Failed
 *
 * Shown on HomeScreen when payment.status = failed.
 *
 *   ┌──────────────────────────────────┐
 *   │  Hero card (dark gradient)       │
 *   │  [●] PAYMENT FAILED              │
 *   │  Your payment didn't go through  │
 *   │  No money was taken…             │
 *   └──────────────────────────────────┘
 *   ┌──────────────────────────────────┐
 *   │  Mint banner — Refunded if…      │
 *   └──────────────────────────────────┘
 *   ┌──────────────────────────────────┐
 *   │  14 profiles are waiting         │
 *   │  They still match…               │
 *   │  [Change method]  [Try again]    │
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

// ─── hero gradient (same calm indigo as VerificationBlock) ────────────────────
const HERO_GRADIENT = ['#5F55A8', '#3E3776', '#2B2653'] as const;

// ─── shield icon for mint banner ─────────────────────────────────────────────
function ShieldIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="#0A5C43"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
interface PaymentFailedBlockProps {
  /** "Try again" — retry the same payment method */
  onRetry?: () => void;
  /** "Change method" — go back to payment screen to pick different method */
  onChangeMethod?: () => void;
  userName?: string;
}

export function PaymentFailedBlock({ onRetry, onChangeMethod, userName = '' }: PaymentFailedBlockProps) {
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
        <LinearGradient
          colors={[...HERO_GRADIENT]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={styles.heroCard}>

          {/* Rose oval pill + label */}
          <View style={styles.heroChip}>
            <LinearGradient
              colors={['#F97DAE', '#E6396E']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.rosePill}
            />
            <Text style={styles.heroChipLabel}>Payment Failed</Text>
          </View>

          <Text style={styles.heroHeading}>
            Your payment{'\n'}didn't go through
          </Text>

          <Text style={styles.heroPara}>
            No money was taken. Your introductions are ready as soon as it clears.
          </Text>
        </LinearGradient>

        {/* ── Mint banner ───────────────────────────────────────────── */}
        <View style={styles.mintBanner}>
          <View style={styles.bannerIcon}>
            <ShieldIcon />
          </View>
          <View style={styles.bannerBody}>
            <Text style={styles.bannerTitle}>Refunded if we don't introduce you</Text>
            <Text style={styles.bannerDesc}>
              No wali-approved introduction within 90 days, no charge.
            </Text>
          </View>
        </View>

        {/* ── White card ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>14 profiles are waiting</Text>
          <Text style={styles.cardPara}>
            They still match your criteria. Nothing has been lost.
          </Text>

          {/* 2-column button row */}
          <View style={styles.btnRow}>
            <Pressable
              onPress={onChangeMethod}
              style={({ pressed }) => [
                styles.btnGray,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}>
              <Text style={styles.btnGrayText}>Change method</Text>
            </Pressable>

            <Pressable
              onPress={onRetry}
              style={({ pressed }) => [
                { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }], flex: 1 },
              ]}>
              <LinearGradient
                colors={['#F2559A', '#E6396E']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.btnRose}>
                <Text style={styles.btnRoseText}>Try again</Text>
              </LinearGradient>
            </Pressable>
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
  },

  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
  },

  rosePill: {
    width: 10,
    height: 20,
    borderRadius: 5,
  },

  heroChipLabel: {
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

  // ── Mint banner ────────────────────────────────────────────────────────────
  mintBanner: {
    backgroundColor: '#E5F6F0',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  bannerIcon: {
    flexShrink: 0,
    marginTop: 1,
  },

  bannerBody: {
    flex: 1,
  },

  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A5C43',
    marginBottom: 3,
  },

  bannerDesc: {
    fontSize: 12,
    color: '#237A5C',
    lineHeight: 18,
  },

  // ── White card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 19,
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2,
  },

  cardHeading: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Colors.ink,
    marginBottom: 4,
  },

  cardPara: {
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 21,
    marginBottom: 16,
  },

  // 2-column button row
  btnRow: {
    flexDirection: 'row',
    gap: 9,
  },

  btnGray: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#F2F1F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnGrayText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.ink2,
  },

  btnRose: {
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnRoseText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#fff',
  },
});
