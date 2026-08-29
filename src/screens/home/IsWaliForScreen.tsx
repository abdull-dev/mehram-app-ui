/**
 * IsWaliForScreen — F11
 *
 * Family tab state: the current user IS the wali for someone else (e.g. their sister).
 * Shows the person they are wali for, stats, review button, and own-search link.
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
  rose:      '#E6396E',
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  indBody:   '#4B4384',
  goldSoft:  '#FBF2DE',
  goldInk:   '#B5820D',
  goldBody:  '#8A6410',
  greySoft:  '#F2F1F7',
  greyInk:   '#6E6B80',
  page:      '#F6F5FA',
  line:      '#EEEDF3',
  ink:       '#17171F',
  ink2:      '#5F5E70',
  ink3:      '#9695A5',
  chev:      '#C6C4D2',
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

function ChevRight() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={C.chev} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

function FamIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={3.5} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </Svg>
  );
}

function UserIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21v-1a7 7 0 0 1 16 0v1" />
    </Svg>
  );
}

function AlertIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 8v5M12 16h.01" />
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

// ─── section header ───────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.shead}>{label}</Text>;
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
interface IsWaliForScreenProps {
  onBack?: () => void;
  onReviewProposal?: () => void;
  onSwitchToProfile?: () => void;
}

// ─── screen ───────────────────────────────────────────────────────────────────
export function IsWaliForScreen({
  onBack,
  onReviewProposal,
  onSwitchToProfile,
}: IsWaliForScreenProps) {
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

        <Banner
          bg={C.indSoft}
          titleColor={C.indInk}
          bodyColor={C.indBody}
          icon={<FamIcon color={C.indInk} />}
          title="You are a wali"
          body="Your sister Sana has asked you to review her proposals."
        />

        {/* Ward card */}
        <View style={styles.card}>
          {/* Wali header */}
          <View style={styles.whead}>
            <View style={[styles.av, { backgroundColor: C.indSoft }]}>
              <Text style={[styles.avText, { color: C.indInk }]}>SM</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.wn}>Sana Mian</Text>
              <Text style={styles.wr}>Sister · you are her wali</Text>
              <View style={[styles.ch, styles.chGold]}>
                <Text style={[styles.chText, { color: C.goldInk }]}>1 needs your review</Text>
              </View>
            </View>
          </View>

          {/* Stats rows */}
          <View style={styles.rows}>
            <DataRow label="Awaiting your review" value="1 proposal" first />
            <DataRow label="Approved by you"       value="3"          />
            <DataRow label="Declined by you"       value="1"          />
            <DataRow label="Open conversations"    value="2"          />
          </View>

          {/* Button */}
          <View style={styles.acts}>
            <Pressable
              onPress={onReviewProposal}
              style={({ pressed }) => [styles.btn, styles.btnF, pressed && { opacity: 0.85 }]}>
              <Text style={[styles.btnText, { color: '#fff' }]}>Review proposal</Text>
            </Pressable>
          </View>
        </View>

        <SectionHeader label="Your own search" />
        <View style={[styles.card, styles.cardOverflow]}>
          <Pressable
            onPress={onSwitchToProfile}
            style={({ pressed }) => [styles.li, pressed && { opacity: 0.7 }]}>
            <View style={[styles.lic, { backgroundColor: C.indSoft }]}>
              <UserIcon color={C.indInk} />
            </View>
            <View style={styles.lib}>
              <Text style={styles.lit}>Switch to your profile</Text>
              <Text style={styles.lis}>Your search is running separately</Text>
            </View>
            <ChevRight />
          </Pressable>
        </View>

        <Banner
          bg={C.goldSoft}
          titleColor={C.goldInk}
          bodyColor={C.goldBody}
          icon={<AlertIcon color={C.goldInk} />}
          title="Keep the two apart"
          body="Being someone's wali never affects your own matches, and she cannot see your search."
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
  },
  cardOverflow: {
    overflow: 'hidden',
  },

  // Section header
  shead: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: C.ink3,
    paddingVertical: 4,
    paddingHorizontal: 6,
    paddingBottom: 9,
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

  // List item (own search)
  li: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  lic: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lib: {
    flex: 1,
  },
  lit: {
    fontSize: 14.5,
    fontWeight: '600',
    color: C.ink,
  },
  lis: {
    fontSize: 12,
    color: C.ink3,
    lineHeight: 17.4,
    marginTop: 1,
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
  btnF: {
    backgroundColor: C.rose,
  },
  btnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
