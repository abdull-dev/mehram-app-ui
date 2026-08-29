/**
 * DownloadDataScreen
 *
 * Request a data download — confirms what will be included.
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
  rose:    '#E6396E',
  indInk:  '#332C66',
  indSoft: '#EEECF8',
  mintSoft:'#E5F6F0',
  mintInk: '#0A5C43',
  greySoft:'#F2F1F7',
  greyInk: '#6E6B80',
  page:    '#F6F5FA',
  line:    '#EEEDF3',
  ink:     '#17171F',
  ink2:    '#5F5E70',
  ink3:    '#9695A5',
} as const;

function ChevLeft() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function DownloadIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 20h14" />
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

interface DownloadDataScreenProps {
  onBack?: () => void;
}

export function DownloadDataScreen({ onBack }: DownloadDataScreenProps) {
  const insets = useSafeAreaInsets();
  const [requested, setRequested] = useState(false);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>Download my data</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        <View style={[styles.banner, { backgroundColor: C.indSoft }]}>
          <ShieldIcon color={C.indInk} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: C.indInk }]}>Your data, your right</Text>
            <Text style={[styles.bannerBody, { color: '#4B4384' }]}>
              We will email you a copy of everything we hold about you within 48 hours.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.pad}>
            <Text style={styles.cardHead}>What is included</Text>
          </View>
          {[
            ['Profile information', 'Name, DOB, city, preferences'],
            ['Biodata', 'All fields you completed'],
            ['Proposal history', 'Sent and received'],
            ['Message history', 'All conversations'],
            ['Account information', 'Registration date, membership'],
          ].map(([label, value], i) => (
            <View key={label} style={[styles.dataRow, i === 0 && styles.dataRowFirst]}>
              <Text style={styles.dataLabel}>{label}</Text>
              <Text style={styles.dataValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.acts}>
            {requested ? (
              <View style={[styles.btn, styles.btnMint]}>
                <Text style={[styles.btnText, { color: C.mintInk }]}>Request sent — check your email</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => setRequested(true)}
                style={({ pressed }) => [styles.btn, styles.btnF, pressed && { opacity: 0.85 }]}>
                <DownloadIcon color="#fff" />
                <Text style={[styles.btnText, { color: '#fff', marginLeft: 8 }]}>Request my data</Text>
              </Pressable>
            )}
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
  dataValue: { fontSize: 12, fontWeight: '500', color: C.ink2, textAlign: 'right', flex: 1 },
  acts: {
    flexDirection: 'row', gap: 9, padding: 15, paddingBottom: 16,
  },
  btn: {
    flex: 1, minHeight: 48, borderRadius: 15, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 10,
  },
  btnF: { backgroundColor: C.rose },
  btnMint: { backgroundColor: C.mintSoft },
  btnText: { fontSize: 13.5, fontWeight: '700' },
});
