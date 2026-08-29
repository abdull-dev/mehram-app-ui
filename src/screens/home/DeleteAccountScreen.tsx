/**
 * DeleteAccountScreen — M5
 *
 * Confirms account deletion with consequences and offers alternatives.
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
  roseInk:   '#A31C48',
  roseSoft:  '#FDECF2',
  roseBody:  '#B03258',
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
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

function AlertIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 8v5M12 16h.01" />
    </Svg>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────
interface DataRowProps { label: string; value: string; first?: boolean }
function DataRow({ label, value, first }: DataRowProps) {
  return (
    <View style={[styles.dataRow, first && styles.dataRowFirst]}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
interface DeleteAccountScreenProps {
  onBack?: () => void;
  onFoundMyMatch?: () => void;
  onKeepAccount?: () => void;
  onDeletePermanently?: () => void;
}

// ─── screen ───────────────────────────────────────────────────────────────────
export function DeleteAccountScreen({
  onBack,
  onFoundMyMatch,
  onKeepAccount,
  onDeletePermanently,
}: DeleteAccountScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>Delete account</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        {/* Rose danger banner */}
        <View style={[styles.banner, { backgroundColor: C.roseSoft }]}>
          <View style={styles.bannerIcon}>
            <AlertIcon color={C.roseInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: C.roseInk }]}>This cannot be undone</Text>
            <Text style={[styles.bannerBody, { color: C.roseBody }]}>
              Your biodata, photos and conversations are removed permanently.
            </Text>
          </View>
        </View>

        {/* What happens card */}
        <View style={styles.card}>
          <View style={styles.cardPad}>
            <Text style={styles.cardH4}>What happens</Text>
          </View>
          <View style={styles.rows}>
            <DataRow label="Your biodata"         value="Deleted within 7 days"             first />
            <DataRow label="Your photos"          value="Deleted immediately"               />
            <DataRow label="Your ID documents"    value="Already deleted"                   />
            <DataRow label="Open conversations"   value="Closed, both sides told"           />
            <DataRow label="Your wali"            value="Told you have left"                />
            <DataRow label="Your membership"      value="Not refundable after 90 days"      />
          </View>
          <View style={styles.cardPadBottom} />
        </View>

        {/* Before you go card */}
        <View style={styles.card}>
          <View style={styles.cardPad}>
            <Text style={styles.cardH4}>Before you go</Text>
            <Text style={styles.cardP}>
              If you found your match, tell us instead. It archives your profile the same way, and it is the number our whole service is measured by.
            </Text>
          </View>
          <View style={styles.acts}>
            <Pressable
              onPress={onFoundMyMatch}
              style={({ pressed }) => [styles.btn, styles.btnO, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.btnText, { color: C.indInk }]}>I found my match</Text>
            </Pressable>
          </View>
        </View>

        {/* Final action card */}
        <View style={styles.card}>
          <View style={styles.acts}>
            <Pressable
              onPress={onKeepAccount}
              style={({ pressed }) => [styles.btn, styles.btnG, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.btnText, { color: '#5F5E70' }]}>Keep my account</Text>
            </Pressable>
            <Pressable
              onPress={onDeletePermanently}
              style={({ pressed }) => [styles.btn, styles.btnR, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.btnText, { color: C.roseInk }]}>Delete permanently</Text>
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
  cardPad: {
    padding: 18,
    paddingBottom: 4,
  },
  cardPadBottom: {
    height: 16,
  },
  cardH4: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 8,
  },
  cardP: {
    fontSize: 13.5,
    color: C.ink2,
    lineHeight: 20,
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
    flexShrink: 0,
  },
  dataValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: C.ink,
    textAlign: 'right',
    flex: 1,
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
  btnR: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#F6CBDA',
  },
  btnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
