/**
 * MembershipScreen — M4
 *
 * Membership and receipt screen. Shows payment info, refund guarantee,
 * and refund options.
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
import Svg, { Path, Rect } from 'react-native-svg';

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  rose:      '#E6396E',
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  mint:      '#17B07E',
  mintSoft:  '#E5F6F0',
  mintInk:   '#0A5C43',
  goldSoft:  '#FBF2DE',
  goldInk:   '#B5820D',
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

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

function CardIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={2} y={5} width={20} height={14} rx={3} />
      <Path d="M2 10h20" />
    </Svg>
  );
}

function DocIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <Path d="M14 3v5h5" />
    </Svg>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.shead}>{label}</Text>;
}

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

interface DataRowProps { label: string; value: string; first?: boolean }
function DataRow({ label, value, first }: DataRowProps) {
  return (
    <View style={[styles.dataRow, first && styles.dataRowFirst]}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

interface ListItemProps {
  icon: React.ReactNode;
  bg: string;
  title: string;
  subtitle?: string;
  first?: boolean;
  onPress?: () => void;
}
function ListItem({ icon, bg, title, subtitle, first, onPress }: ListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.li, first && styles.liFirst, pressed && { opacity: 0.7 }]}>
      <View style={[styles.lic, { backgroundColor: bg }]}>
        {icon}
      </View>
      <View style={styles.lib}>
        <Text style={styles.lit}>{title}</Text>
        {!!subtitle && <Text style={styles.lis}>{subtitle}</Text>}
      </View>
      <ChevRight />
    </Pressable>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
interface MembershipScreenProps {
  onBack?: () => void;
  /** Omitted while no receipt endpoint exists — the row hides itself. */
  onEmailReceipt?: () => void;
  onRequestRefund?: () => void | Promise<void>;
  /** Outcome of a refund request, shown next to the button that caused it. */
  refundNotice?: string | null;
  onReadRefundPolicy?: () => void;
}

// ─── screen ───────────────────────────────────────────────────────────────────
export function MembershipScreen({
  onBack,
  onEmailReceipt,
  onRequestRefund,
  refundNotice,
  onReadRefundPolicy,
}: MembershipScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>Membership</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        {/* Main membership card */}
        <View style={styles.card}>
          <View style={styles.amountWrap}>
            <Text style={styles.amount}>PKR 4,500</Text>
            <Text style={styles.amountSub}>Paid in full · no renewal</Text>
          </View>
          <View style={styles.rows}>
            <DataRow label="Paid"         value="26 August 2026"  first />
            <DataRow label="Method"       value="Google Play"     />
            <DataRow label="Status"       value="Active for life" />
            <DataRow label="Next charge"  value="None, ever"      />
          </View>
          {/* Hidden without a handler: there is no receipt endpoint, and a
              button that cannot do its job is worse than an absent one. */}
          {!!onEmailReceipt && <View style={styles.acts}>
            <Pressable
              onPress={onEmailReceipt}
              style={({ pressed }) => [styles.btn, styles.btnO, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.btnText, { color: C.indInk }]}>Email me a receipt</Text>
            </Pressable>
          </View>}
        </View>

        <Banner
          bg={C.mintSoft}
          titleColor={C.mintInk}
          bodyColor="#237A5C"
          icon={<ShieldIcon color={C.mintInk} />}
          title="Refunded if we do not introduce you"
          body="If no wali-approved introduction happens within 90 days of payment, we refund you in full."
        />

        <SectionHeader label="Refunds" />
        <View style={[styles.card, styles.cardOverflow]}>
          <ListItem
            first
            icon={<CardIcon color={C.greyInk} />}
            bg={C.greySoft}
            title="Request a refund"
            subtitle="Day 62 of 90"
            onPress={onRequestRefund}
          />
          <ListItem
            icon={<DocIcon color={C.greyInk} />}
            bg={C.greySoft}
            title="Read the refund policy"
            onPress={onReadRefundPolicy}
          />
        </View>

        {/* The outcome, next to the button that caused it. The request is
            recorded for review — it does not refund anything by itself, so the
            copy must not imply money has moved. */}
        {!!refundNotice && <Text style={styles.refundNotice}>{refundNotice}</Text>}

      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  refundNotice: {
    fontSize: 13,
    lineHeight: 19,
    color: C.indInk,
    paddingHorizontal: 4,
    marginTop: 10,
  },
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

  // Amount header
  amountWrap: {
    alignItems: 'center',
    paddingTop: 22,
    paddingBottom: 4,
  },
  amount: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: C.ink,
  },
  amountSub: {
    fontSize: 13,
    color: C.ink3,
    marginTop: 4,
  },

  // Data rows
  rows: {
    paddingHorizontal: 16,
    paddingTop: 6,
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
  },
  btnO: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EEECF8',
  },
  btnText: {
    fontSize: 13.5,
    fontWeight: '700',
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

  // List item
  li: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  liFirst: {
    borderTopWidth: 0,
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
});
