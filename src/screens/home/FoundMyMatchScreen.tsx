/**
 * FoundMyMatchScreen
 *
 * User tells us they found their match — archives profile.
 */

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

const C = {
  rose:     '#E6396E',
  roseInk:  '#A31C48',
  roseSoft: '#FDECF2',
  indInk:   '#332C66',
  indSoft:  '#EEECF8',
  mintSoft: '#E5F6F0',
  mintInk:  '#0A5C43',
  greySoft: '#F2F1F7',
  greyInk:  '#6E6B80',
  page:     '#F6F5FA',
  line:     '#EEEDF3',
  ink:      '#17171F',
  ink2:     '#5F5E70',
  ink3:     '#9695A5',
} as const;

function ChevLeft() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function RingIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
      <Path d="M9 8l1.5-4h3L15 8" />
    </Svg>
  );
}
function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

interface FoundMyMatchScreenProps {
  onBack?: () => void;
  onConfirm?: () => void;
}

export function FoundMyMatchScreen({ onBack, onConfirm }: FoundMyMatchScreenProps) {
  const insets = useSafeAreaInsets();
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <RingIcon color={C.mintInk} />
          </View>
          <Text style={styles.successTitle}>Mabrook!</Text>
          <Text style={styles.successSub}>
            Your profile has been archived. May Allah bless your union.
          </Text>
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [styles.btn, styles.btnF, pressed && { opacity: 0.85 }]}>
            <Text style={[styles.btnText, { color: '#fff' }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>I found my match</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        <View style={[styles.banner, { backgroundColor: C.mintSoft }]}>
          <RingIcon color={C.mintInk} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: C.mintInk }]}>
              This is the number we exist for
            </Text>
            <Text style={[styles.bannerBody, { color: '#237A5C' }]}>
              Telling us means your profile is archived the same way as deleting — but it helps our community.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.pad}>
            <Text style={styles.cardHead}>What happens</Text>
          </View>
          {[
            ['Your profile', 'Archived immediately'],
            ['Your photos', 'Removed from view'],
            ['Open conversations', 'Closed gracefully'],
            ['Your data', 'Kept for 30 days then deleted'],
            ['Your membership', 'Honoured — no further charges'],
          ].map(([label, value], i) => (
            <View key={label} style={[styles.dataRow, i === 0 && styles.dataRowFirst]}>
              <Text style={styles.dataLabel}>{label}</Text>
              <Text style={styles.dataValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.banner, { backgroundColor: C.indSoft, marginTop: 4 }]}>
          <ShieldIcon color={C.indInk} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: C.indInk }]}>
              Your privacy is protected
            </Text>
            <Text style={[styles.bannerBody, { color: '#4B4384' }]}>
              We do not share who matched or with whom. This information stays private.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.acts}>
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [styles.btn, styles.btnG, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.btnText, { color: C.greyInk }]}>Not yet</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmed(true)}
              style={({ pressed }) => [styles.btn, styles.btnF, pressed && { opacity: 0.85 }]}>
              <Text style={[styles.btnText, { color: '#fff' }]}>Yes, I found my match</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.page },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 15, paddingTop: 10, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 13, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(40,30,80,0.07)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: C.ink },
  scroll: { paddingHorizontal: 15, paddingTop: 8 },
  banner: {
    borderRadius: 18, padding: 13, paddingHorizontal: 14,
    marginBottom: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  bannerTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 2 },
  bannerBody: { fontSize: 12, lineHeight: 18.6 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, marginBottom: 12,
    shadowColor: 'rgba(40,30,80,1)', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055, shadowRadius: 14, elevation: 3, overflow: 'hidden',
  },
  pad: { padding: 18, paddingBottom: 4 },
  cardHead: { fontSize: 16, fontWeight: '700', color: C.ink },
  dataRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: C.line, gap: 10,
  },
  dataRowFirst: { borderTopWidth: 0 },
  dataLabel: { fontSize: 13.5, color: C.ink3 },
  dataValue: { fontSize: 13.5, fontWeight: '600', color: C.ink, textAlign: 'right', flex: 1 },
  acts: { flexDirection: 'row', gap: 9, padding: 15, paddingBottom: 16 },
  btn: { flex: 1, minHeight: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  btnG: { backgroundColor: C.greySoft },
  btnF: { backgroundColor: C.rose },
  btnText: { fontSize: 13.5, fontWeight: '700' },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successIcon: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: C.mintSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: C.ink, marginBottom: 12 },
  successSub: { fontSize: 15, color: C.ink2, textAlign: 'center', lineHeight: 23, marginBottom: 32 },
});
