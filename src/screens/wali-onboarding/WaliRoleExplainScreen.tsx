/**
 * WaliRoleExplainScreen — W3
 *
 * "What you will be able to do" — two cards listing can/cannot.
 * Progress bar at 55% — "Step 2 of 3".
 * Mint green banner "You are never charged".
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Colors, GRAD } from '../../theme/colors';

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vioInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={Colors.mintInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

// ─── reusable row inside a card ───────────────────────────────────────────────
function CardRow({
  label,
  value,
  first = false,
  valueColor,
}: {
  label: string;
  value: string;
  first?: boolean;
  valueColor: string;
}) {
  return (
    <View style={[styles.cardRow, !first && styles.cardRowBorder]}>
      <Text style={styles.cardRowLabel}>{label}</Text>
      <Text style={[styles.cardRowValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
interface WaliRoleExplainScreenProps {
  /** The ward's name, from `GET /wali/me`. Copy reads without it when absent. */
  dependentName?: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onBack?: () => void;
}

// ─── component ────────────────────────────────────────────────────────────────
export function WaliRoleExplainScreen({
  dependentName,
  onAccept,
  onDecline,
  onBack,
}: WaliRoleExplainScreenProps) {
  const insets = useSafeAreaInsets();

  const ward = dependentName?.trim() || null;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      {/* Nav bar */}
      <View style={styles.navbar}>
        {/* Omitted when there is nothing behind this screen — a resumed
            session starts here, and a control that does nothing is worse than
            no control. */}
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
            <BackIcon />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[...GRAD]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.progressFill}
          />
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>Step 2 of 3</Text>
          </View>
          <Text style={styles.heading}>What you will{'\n'}be able to do</Text>
          <Text style={styles.subheading}>Please read this before you accept. It is short.</Text>
        </View>

        {/* "You can" card */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>You can</Text>
          </View>
          <CardRow
            first
            label={`Review proposals before ${ward ?? 'they'} see${ward ? 's' : ''} them`}
            value="Yes"
            valueColor={Colors.mintInk}
          />
          <CardRow
            label={`Decline a proposal on ${ward ? `${ward}'s` : 'their'} behalf`}
            value="Yes"
            valueColor={Colors.mintInk}
          />
          <CardRow
            label="Read her conversations, live"
            value="Yes"
            valueColor={Colors.mintInk}
          />
          <CardRow
            label="Join her voice and video calls"
            value="Yes"
            valueColor={Colors.mintInk}
          />
        </View>

        {/* "You cannot" card */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>You cannot</Text>
          </View>
          <CardRow
            first
            label="See her photographs"
            value="Never"
            valueColor={Colors.ink3}
          />
          <CardRow
            label="Accept a proposal for her"
            value="Never"
            valueColor={Colors.ink3}
          />
          <CardRow
            label="Edit her biodata or preferences"
            value="Never"
            valueColor={Colors.ink3}
          />
          <CardRow
            label="Message anyone as her"
            value="Never"
            valueColor={Colors.ink3}
          />
        </View>

        {/* Mint banner */}
        <View style={styles.mintBanner}>
          <ShieldIcon />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>You are never charged</Text>
            <Text style={styles.bannerBody}>Being a wali is free, and always will be.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <Pressable
          onPress={onAccept}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <LinearGradient
            colors={[...GRAD]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.btnFilled}>
            <Text style={styles.btnFilledText}>I understand, continue</Text>
          </LinearGradient>
        </Pressable>

      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.page,
    paddingHorizontal: 20,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  // Holds the back button's place in the row when there is nothing behind this
  // screen. Dimensions only: reusing `backBtn` left its chip and shadow behind
  // as an empty white square where the button used to be.
  backSpacer: { width: 38, height: 38, flexShrink: 0 },
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
    shadowRadius: 8,
    elevation: 3,
  },
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '55%',
    height: 7,
    borderRadius: 5,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 16,
    gap: 12,
  },
  header: {},
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vioSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
    marginBottom: 10,
  },
  stepText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.vioInk,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 30,
    color: Colors.ink,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHead: {
    padding: 17,
    paddingBottom: 4,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: Colors.ink,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },
  cardRowLabel: {
    flex: 1,
    fontSize: 13.5,
    color: Colors.ink2,
    lineHeight: 18,
  },
  cardRowValue: {
    fontSize: 13.5,
    fontWeight: '700',
    marginLeft: 8,
  },
  mintBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E9FBF3',
    borderRadius: 18,
    padding: 14,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.mintInk,
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#2A7A5E',
  },
  footer: {
    gap: 9,
    paddingTop: 8,
  },
  btnFilled: {
    height: 54,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFilledText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#fff',
  },
  btnGhost: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink2,
  },
});
