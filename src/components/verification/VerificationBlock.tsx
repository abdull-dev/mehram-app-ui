/**
 * VerificationBlock — full-screen component for H3 (face failed) and H4 (CNIC pending).
 *
 * variant='face'  →  H3: Verification Failed (face scan)
 * variant='cnic'  →  H4: Action Needed (CNIC / passport resubmit)
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
import Svg, { Path, Polyline } from 'react-native-svg';
import { Colors } from '../../theme/colors';

// ─── hero gradient ────────────────────────────────────────────────────────────
const HERO_GRADIENT = ['#5F55A8', '#3E3776', '#2B2653'] as const;

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="15 18 9 12 15 6"
        stroke={Colors.vioInk}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── TipRow ───────────────────────────────────────────────────────────────────
function TipRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.tipRow, !last && styles.tipRowBorder]}>
      <Text style={styles.tipLabel}>{label}</Text>
      <Text style={styles.tipValue}>{value}</Text>
    </View>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
interface VerificationBlockProps {
  variant: 'face' | 'cnic';
  attemptsLeft?: number;
  onAction?: () => void;
  onBack?: () => void;
  userName?: string;
}

export function VerificationBlock({
  variant,
  attemptsLeft = 2,
  onAction,
  onBack,
  userName = '',
}: VerificationBlockProps) {
  const insets = useSafeAreaInsets();
  const isFace = variant === 'face';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 8, 24),
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

        {/* ── Back button ───────────────────────────────────────────── */}
        {onBack && (
          <View style={styles.backRow}>
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.backBtn,
                { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}>
              <BackIcon />
            </Pressable>
          </View>
        )}

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
            <Text style={styles.heroChipLabel}>
              {isFace ? 'Verification Failed' : 'Action Needed'}
            </Text>
          </View>

          <Text style={styles.heroHeading}>
            {isFace ? "We couldn't verify\nyour face" : 'One more document\nneeded'}
          </Text>

          <Text style={styles.heroPara}>
            {isFace
              ? "Don't worry — it happens. Make sure your face is clearly lit and centred in the frame."
              : 'Everything else is ready. This is the only step between you and your introductions.'}
          </Text>
        </LinearGradient>

        {/* ── Banner ────────────────────────────────────────────────── */}
        {isFace ? (
          <LinearGradient
            colors={['#FDF5E6', '#FBEFD8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}>
            <View style={[styles.bannerCircle, { borderColor: Colors.goldInk }]}>
              <Text style={[styles.bannerCircleText, { color: Colors.goldInk }]}>!</Text>
            </View>
            <View style={styles.bannerBody}>
              <Text style={[styles.bannerTitle, { color: Colors.goldInk }]}>
                {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining
              </Text>
              <Text style={[styles.bannerDesc, { color: '#8A6410' }]}>
                After that, a member of our team will review it by hand.
              </Text>
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={['#E9FBF3', '#DFF6EC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}>
            <View style={[styles.bannerCircle, { borderColor: Colors.mintInk }]}>
              <Text style={[styles.bannerCircleText, { color: Colors.mintInk }]}>!</Text>
            </View>
            <View style={styles.bannerBody}>
              <Text style={[styles.bannerTitle, { color: Colors.mintInk }]}>
                Everything else is done
              </Text>
              <Text style={[styles.bannerDesc, { color: '#2A7A5E' }]}>
                This is the only thing between you and your introductions.
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* ── White card ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isFace ? 'What usually helps' : 'What to check'}
          </Text>
          <View style={styles.cardDivider} />

          {isFace ? (
            <>
              <TipRow label="Lighting" value="Daylight, no glare" />
              <TipRow label="Frame" value="All four corners visible" />
              <TipRow label="Card" value="Original, not a photocopy" />
              <TipRow label="Face" value="No glasses or cap" last />
            </>
          ) : (
            <View style={styles.cardHintWrap}>
              <Text style={styles.cardHint}>
                Upload a clear photo of your CNIC or passport. Make sure all text and corners are visible.
              </Text>
            </View>
          )}

          {/* Rose action button — inside card */}
          <Pressable
            onPress={onAction}
            style={({ pressed }) => ({
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}>
            <LinearGradient
              colors={['#F2559A', '#E6396E']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.roseBtn}>
              <Text style={styles.roseBtnText}>
                {isFace ? 'Try again' : 'Upload document'}
              </Text>
            </LinearGradient>
          </Pressable>
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
  },

  hdr: { paddingHorizontal: 4, paddingTop: 11, paddingBottom: 13 },
  hdrSalam: { fontSize: 13.5, color: '#9695A5' },
  hdrName: { fontSize: 25, fontWeight: '700', letterSpacing: -0.6, color: '#17171F', marginTop: 1 },

  // ── Back button ──────────────────────────────────────────────────────────
  backRow: {
    marginBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  // ── Hero card ────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
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
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#CFC4F5',
  },

  heroHeading: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
    color: '#fff',
    marginBottom: 10,
  },

  heroPara: {
    fontSize: 13,
    color: '#CBC1EE',
    lineHeight: 20,
  },

  // ── Banner ───────────────────────────────────────────────────────────────
  banner: {
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  bannerCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },

  bannerCircleText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },

  bannerBody: {
    flex: 1,
  },

  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },

  bannerDesc: {
    fontSize: 11.5,
    lineHeight: 17,
  },

  // ── White card ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.ink,
    padding: 16,
    paddingBottom: 14,
  },

  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },

  tipRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },

  tipLabel: {
    fontSize: 13,
    color: Colors.ink3,
    width: 72,
    flexShrink: 0,
  },

  tipValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
    textAlign: 'right',
  },

  cardHintWrap: {
    padding: 16,
  },

  cardHint: {
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 20,
  },

  // Rose button — sits inside the white card
  roseBtn: {
    margin: 14,
    marginTop: 12,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  roseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
