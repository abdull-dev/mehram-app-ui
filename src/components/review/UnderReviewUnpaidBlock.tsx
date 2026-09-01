/**
 * UnderReviewUnpaidBlock — H8: Under Review, Unpaid
 *
 * Shown on HomeScreen when verification = pending AND payment ≠ paid.
 *
 *   ┌──────────────────────────────────┐
 *   │  Hero (dark indigo, amber dot)   │
 *   │  UNDER REVIEW                    │
 *   │  Our team is checking your ID    │
 *   │  Every profile is checked…       │
 *   │  ─────────────────────────────   │
 *   │  Under 24h   │   6h ago         │
 *   │  Typical review   You submitted  │
 *   └──────────────────────────────────┘
 *   ┌──────────────────────────────────┐
 *   │  MEMBERSHIP  (dark indigo)       │
 *   │  Be ready the moment you're…    │
 *   │  14 profiles already match…      │
 *   │  PKR 4,500 · one payment         │
 *   │  [Become a member]               │
 *   │  🛡 If verification doesn't…     │
 *   └──────────────────────────────────┘
 *   ┌──────────────────────────────────┐
 *   │  While you wait   2 of 5 done   │
 *   │  ████░░░░░░░░  (progress bar)   │
 *   │  ○ Confirm your wali  Recommended│
 *   │  › Improve your biodata          │
 *   │  › Review your preferences       │
 *   │  ✓ Photos added                  │
 *   │  ✓ Biodata submitted             │
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
import Svg, { Path, Polyline, Circle } from 'react-native-svg';
import { Colors } from '../../theme/colors';
import { DailyDuaCard } from '../ui/DailyDuaCard';
import { WhileYouWaitCard } from '../ui/WhileYouWaitCard';
import { GRADIENT_FILL } from '../../theme/layout';

// ─── gradients ────────────────────────────────────────────────────────────────
const HERO_GRADIENT   = ['#5F55A8', '#3E3776', '#2B2653'] as const;
const PAY_GRADIENT    = ['#3E3776', '#2B2653'] as const;
const ROSE_GRADIENT   = ['#F2559A', '#E6396E'] as const;

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

function CheckIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke="#fff"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="9 18 15 12 9 6"
        stroke={Colors.ink3}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Checklist item icon components
function FamilyIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PenIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SlidersIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M1 14h6M9 8h6M17 16h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ImageIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="8.5" cy="8.5" r="1.5" stroke={color} strokeWidth={2} />
      <Path
        d="M21 15l-5-5L5 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DocIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── checklist row ────────────────────────────────────────────────────────────
interface ChecklistItemProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  done?: boolean;
  pill?: { label: string; color: 'rose' | 'mint' };
  first?: boolean;
  onPress?: () => void;
}

function ChecklistItem({
  icon,
  iconBg,
  title,
  subtitle,
  done = false,
  pill,
  first = false,
  onPress,
}: ChecklistItemProps) {
  const pillColors = {
    rose: { bg: Colors.roseSoft, text: Colors.roseInk },
    mint: { bg: Colors.mintSoft, text: Colors.mintInk },
  };

  const content = (
    <View style={[styles.ciRow, !first && styles.ciRowBorder]}>
      <View style={[styles.ciIcon, { backgroundColor: done ? '#F4F3F8' : iconBg }]}>
        {icon}
      </View>
      <View style={styles.ciBody}>
        <Text style={[styles.ciTitle, done && styles.ciTitleDone]}>{title}</Text>
        <Text style={[styles.ciSub, done && styles.ciSubDone]}>{subtitle}</Text>
      </View>
      {done ? (
        <View style={styles.tick}>
          <CheckIcon />
        </View>
      ) : pill ? (
        <View style={[styles.pill, { backgroundColor: pillColors[pill.color].bg }]}>
          <Text style={[styles.pillText, { color: pillColors[pill.color].text }]}>{pill.label}</Text>
        </View>
      ) : (
        <ChevronRightIcon />
      )}
    </View>
  );

  if (onPress && !done) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return content;
}

// ─── relative time helper ─────────────────────────────────────────────────────
function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ─── component ────────────────────────────────────────────────────────────────
interface UnderReviewUnpaidBlockProps {
  /** Primary CTA — navigate to payment screen */
  onBecomeAMember?: () => void;
  /** Optional: improve biodata tap */
  onImproveBiodata?: () => void;
  /** Optional: review preferences tap */
  onReviewPreferences?: () => void;
  userName?: string;
  /** When the user submitted their verification — drives the "Xh ago" stat */
  submittedAt?: Date;
}

export function UnderReviewUnpaidBlock({
  onBecomeAMember,
  onImproveBiodata,
  onReviewPreferences,
  userName = '',
  submittedAt,
}: UnderReviewUnpaidBlockProps) {
  const submittedLabel = submittedAt ? formatTimeAgo(submittedAt) : '—';
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

          {/* Amber pulse dot + label */}
          <View style={styles.heroTop}>
            <View style={styles.amberpulse} />
            <Text style={styles.heroLabel}>Under Review</Text>
          </View>

          <Text style={styles.heroHeading}>
            Our team is{'\n'}checking your ID
          </Text>

          <Text style={styles.heroPara}>
            Every profile is checked by a person, not a machine. That is why families trust Mehram.
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statNumber}>Under 24h</Text>
              <Text style={styles.statLabel}>Typical review</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statNumber}>{submittedLabel}</Text>
              <Text style={styles.statLabel}>You submitted</Text>
            </View>
          </View>
        </View>

        {/* ── Membership / Payment card ──────────────────────────────── */}
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
            Be ready the moment{'\n'}you're approved
          </Text>

          <Text style={styles.payPara}>
            14 profiles already match your criteria. Members receive their introductions the same hour verification clears.
          </Text>

          {/* Price row */}
          <View style={styles.payPriceRow}>
            <Text style={styles.payPrice}>PKR 4,500</Text>
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
              If verification doesn't pass, you're refunded in full, automatically. No introduction in 90 days, also refunded.
            </Text>
          </View>
        </View>

        {/* ── While you wait checklist ──────────────────────────────── */}
        <WhileYouWaitCard
          doneCount={2}
          onImproveBiodata={onImproveBiodata}
          onReviewPreferences={onReviewPreferences}
        />

        {/* ── Daily Dua ─────────────────────────────────────────────── */}
        <DailyDuaCard />

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

  // Amber/gold pulse dot (verification pending = amber)
  amberpulse: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F2C14E',
    shadowColor: '#F2C14E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
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

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },

  statCell: {
    flex: 1,
  },

  statCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.14)',
    paddingLeft: 20,
  },

  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.4,
  },

  statLabel: {
    fontSize: 10.5,
    color: '#B5A9E4',
    marginTop: 2,
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

  // ── Checklist card ────────────────────────────────────────────────────────
  checklistCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2,
  },

  checklistHeader: {
    paddingHorizontal: 19,
    paddingTop: 17,
    paddingBottom: 14,
  },

  checklistHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 9,
  },

  checklistTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Colors.ink,
  },

  checklistCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mintInk,
  },

  progressTrack: {
    height: 7,
    borderRadius: 5,
    backgroundColor: '#EDECF3',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: Colors.mint,
  },

  // ── Checklist item ────────────────────────────────────────────────────────
  ciRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 19,
  },

  ciRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },

  ciIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  ciBody: {
    flex: 1,
    minWidth: 0,
  },

  ciTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },

  ciTitleDone: {
    color: Colors.ink3,
    fontWeight: '600',
  },

  ciSub: {
    fontSize: 12,
    color: Colors.ink2,
    lineHeight: 17,
    marginTop: 2,
  },

  ciSubDone: {
    color: Colors.ink3,
  },

  tick: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: Colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    flexShrink: 0,
  },

  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
