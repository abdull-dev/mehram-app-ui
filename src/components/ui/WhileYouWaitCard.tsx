/**
 * WhileYouWaitCard
 *
 * Standalone "While you wait" checklist card.
 * Matches the HTML design exactly:
 *
 *   ┌─────────────────────────────────────────┐
 *   │  While you wait          2 of 4 done   │
 *   │  ████████░░░░░░░░░░░░░░░  (progress)   │
 *   ├─────────────────────────────────────────┤
 *   │  [icon]  Improve your biodata      ›   │
 *   │          Two sections are still short. │
 *   ├─────────────────────────────────────────┤
 *   │  [icon]  Review your preferences   ›   │
 *   │          Widening age by 2 years…      │
 *   ├─────────────────────────────────────────┤
 *   │  [icon]  Photos added           [✓]   │  ← done, muted
 *   │          Private. Nobody can see them. │
 *   ├─────────────────────────────────────────┤
 *   │  [icon]  Biodata submitted      [✓]   │  ← done, muted
 *   │          All 8 sections complete.      │
 *   └─────────────────────────────────────────┘
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { Colors } from '../../theme/colors';

// ─── icons ────────────────────────────────────────────────────────────────────

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
      <Circle cx={8.5} cy={8.5} r={1.5} stroke={color} strokeWidth={2} />
      <Path d="M21 15l-5-5L5 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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

function CheckIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="20 6 9 17 4 12"
        stroke="#fff"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={Colors.ink3}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── checklist item ───────────────────────────────────────────────────────────

interface ItemProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  done?: boolean;
  pill?: { label: string; color: 'rose' | 'mint' };
  first?: boolean;
  onPress?: () => void;
}

function Item({ icon, iconBg, title, subtitle, done = false, pill, first = false, onPress }: ItemProps) {
  const pillColors = {
    rose: { bg: Colors.roseSoft, text: Colors.roseInk },
    mint: { bg: Colors.mintSoft, text: Colors.mintInk },
  };

  const row = (
    <View style={[s.row, !first && s.rowBorder]}>
      <View style={[s.iconBox, { backgroundColor: done ? '#F4F3F8' : iconBg }]}>
        {icon}
      </View>
      <View style={s.body}>
        <Text style={[s.title, done && s.titleDone]}>{title}</Text>
        <Text style={[s.subtitle, done && s.subtitleDone]}>{subtitle}</Text>
      </View>
      {done ? (
        <View style={s.tick}>
          <CheckIcon />
        </View>
      ) : pill ? (
        <View style={[s.pill, { backgroundColor: pillColors[pill.color].bg }]}>
          <Text style={[s.pillText, { color: pillColors[pill.color].text }]}>{pill.label}</Text>
        </View>
      ) : (
        <ChevronRightIcon />
      )}
    </View>
  );

  if (onPress && !done) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
        {row}
      </Pressable>
    );
  }
  return row;
}

// ─── component ────────────────────────────────────────────────────────────────

export interface WhileYouWaitCardProps {
  /** Number of completed items out of the total below */
  doneCount?: number;
  /** Hide the already-done "Photos added" and "Biodata submitted" rows */
  hideDoneItems?: boolean;
  onImproveBiodata?: () => void;
  onReviewPreferences?: () => void;
}

export function WhileYouWaitCard({
  doneCount = 2,
  hideDoneItems = false,
  onImproveBiodata,
  onReviewPreferences,
}: WhileYouWaitCardProps) {
  const total = hideDoneItems ? 2 : 4;
  const progressPct = `${Math.round((doneCount / total) * 100)}%`;

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>While you wait</Text>
          <Text style={s.headerCount}>{doneCount} of {total} done</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: progressPct }]} />
        </View>
      </View>

      {/* Improve biodata */}
      <Item
        first
        icon={<PenIcon color="#A31C48" />}
        iconBg="#FDECF2"
        title="Improve your biodata"
        subtitle="Two sections are still short."
        onPress={onImproveBiodata}
      />

      {/* Review preferences */}
      <Item
        icon={<SlidersIcon color="#B5820D" />}
        iconBg="#FBF2DE"
        title="Review your preferences"
        subtitle="Widening age by 2 years adds 9 profiles."
        onPress={onReviewPreferences}
      />

      {/* Photos added — done */}
      {!hideDoneItems && (
        <Item
          icon={<ImageIcon color="#9695A5" />}
          iconBg="#F4F3F8"
          title="Photos added"
          subtitle="Private. Nobody can see them."
          done
        />
      )}

      {/* Biodata submitted — done */}
      {!hideDoneItems && (
        <Item
          icon={<DocIcon color="#9695A5" />}
          iconBg="#F4F3F8"
          title="Biodata submitted"
          subtitle="All 8 sections complete."
          done
        />
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    overflow: 'hidden',
    // Matches DailyDuaCard, which is what usually follows it. Without this the
    // two cards butted together with no gap and read as one block.
    marginBottom: 12,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2,
  },

  // ── header ──
  header: {
    paddingHorizontal: 19,
    paddingTop: 17,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 9,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Colors.ink,
  },
  headerCount: {
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
    backgroundColor: '#17B07E',
  },

  // ── item row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 19,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#EEEDF3',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
    lineHeight: 19,
  },
  titleDone: {
    color: '#9695A5',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.ink2,
    lineHeight: 17,
    marginTop: 2,
  },
  subtitleDone: {
    color: '#9695A5',
  },

  // ── done tick ──
  tick: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#17B07E',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // ── pill badge ──
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    flexShrink: 0,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
