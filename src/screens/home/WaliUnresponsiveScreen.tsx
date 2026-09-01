/**
 * WaliUnresponsiveScreen — F9
 *
 * Family tab state: wali is not responding to proposals.
 * NOTE: "Add a second wali" is intentionally omitted — only one wali allowed.
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
import Svg, { Circle, Path } from 'react-native-svg';

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  goldSoft:  '#FBF2DE',
  goldInk:   '#B5820D',
  goldBody:  '#8A6410',
  page:      '#F6F5FA',
  line:      '#EEEDF3',
  ink:       '#17171F',
  ink2:      '#5F5E70',
  ink3:      '#9695A5',
} as const;

// ─── icons ────────────────────────────────────────────────────────────────────
function ChevLeft() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

// ─── banner ───────────────────────────────────────────────────────────────────
function Banner({ icon, title, body, bg, titleColor, bodyColor }: {
  icon: React.ReactNode;
  title: string;
  body: string;
  bg: string;
  titleColor: string;
  bodyColor: string;
}) {
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <View style={styles.bannerIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color: titleColor }]}>{title}</Text>
        <Text style={[styles.bannerBody, { color: bodyColor }]}>{body}</Text>
      </View>
    </View>
  );
}

// ─── data row ─────────────────────────────────────────────────────────────────
function DataRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={[styles.dataRow, first && styles.dataRowFirst]}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
interface WaliUnresponsiveScreenProps {
  waliName: string;
  waliInitials: string;
  waliRelationship: string;
  joinedLabel: string;
  proposalsAwaitingReview: number;
  onBack?: () => void;
  onChangeWali?: () => void;
}

// ─── screen ───────────────────────────────────────────────────────────────────
export function WaliUnresponsiveScreen({
  waliName,
  waliInitials,
  waliRelationship,
  joinedLabel,
  proposalsAwaitingReview,
  onBack,
  onChangeWali,
}: WaliUnresponsiveScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>Family</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        {/* Wali card */}
        <View style={styles.card}>
          {/* Wali header */}
          <View style={styles.whead}>
            <View style={[styles.av, { backgroundColor: C.indSoft }]}>
              <Text style={[styles.avText, { color: C.indInk }]}>{waliInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.wn}>{waliName}</Text>
              <Text style={styles.wr}>{waliRelationship} · {joinedLabel}</Text>
              <View style={[styles.ch, styles.chGold]}>
                <Text style={[styles.chText, { color: C.goldInk }]}>Not responding</Text>
              </View>
            </View>
          </View>

          {/* Stats rows */}
          <View style={styles.rows}>
            <DataRow
              label="Awaiting his review"
              value={`${proposalsAwaitingReview} ${proposalsAwaitingReview === 1 ? 'proposal' : 'proposals'}`}
              first
            />
          </View>

          {/* Buttons. Offered only when there is somewhere for the press to go:
              without a handler this rendered a button that did nothing. */}
          {onChangeWali ? (
            <View style={styles.acts}>
              <Pressable
                onPress={onChangeWali}
                style={({ pressed }) => [styles.btn, styles.btnG, pressed && { opacity: 0.8 }]}>
                <Text style={[styles.btnText, { color: '#5F5E70' }]}>Change wali</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <Banner
          bg={C.goldSoft}
          titleColor={C.goldInk}
          bodyColor={C.goldBody}
          icon={<ClockIcon color={C.goldInk} />}
          title="Families are waiting on him"
          body="A proposal that sits too long is usually withdrawn by the other side."
        />

      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.page,
  },

  // TopBar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(40,30,80,0.07)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    flexShrink: 0,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: C.ink,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 15,
    paddingTop: 4,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 13,
    overflow: 'hidden',
  },

  // Wali header
  whead: {
    padding: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 13,
  },
  av: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avText: {
    fontSize: 18,
    fontWeight: '700',
  },
  wn: {
    fontSize: 19,
    fontWeight: '700',
    color: C.ink,
  },
  wr: {
    fontSize: 13,
    color: C.ink2,
    marginTop: 2,
  },
  ch: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    marginTop: 6,
  },
  chGold: {
    backgroundColor: C.goldSoft,
  },
  chText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Data rows
  rows: {
    paddingHorizontal: 16,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    gap: 10,
  },
  dataRowFirst: {
    borderTopWidth: 0,
  },
  dataLabel: {
    fontSize: 13.5,
    color: C.ink3,
  },
  dataValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: C.ink,
    textAlign: 'right',
  },

  // Banner
  banner: {
    borderRadius: 18,
    padding: 13,
    paddingHorizontal: 14,
    marginBottom: 13,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bannerIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 12,
    lineHeight: 18.6,
  },

  // Action buttons
  acts: {
    flexDirection: 'row',
    gap: 9,
    padding: 15,
    paddingBottom: 16,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  btnO: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EEECF8',
  },
  btnG: {
    backgroundColor: '#F2F1F7',
  },
  btnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
