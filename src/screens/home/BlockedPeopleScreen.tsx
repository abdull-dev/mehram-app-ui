/**
 * BlockedPeopleScreen
 *
 * List of blocked people. Empty state by default.
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
import Svg, { Path, Circle } from 'react-native-svg';

const C = {
  indInk:  '#332C66',
  indSoft: '#EEECF8',
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

function BanIcon() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none"
      stroke={C.ink3} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M5.6 5.6l12.8 12.8" />
    </Svg>
  );
}

interface BlockedPeopleScreenProps {
  onBack?: () => void;
}

export function BlockedPeopleScreen({ onBack }: BlockedPeopleScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <View>
          <Text style={styles.topBarTitle}>Blocked people</Text>
          <Text style={styles.topBarSub}>0 blocked</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        <View style={styles.emptyCard}>
          <BanIcon />
          <Text style={styles.emptyTitle}>Nobody blocked</Text>
          <Text style={styles.emptySub}>
            If you block someone from their profile, they will appear here.
            They will not be notified.
          </Text>
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
  topBarSub: { fontSize: 11.5, color: C.ink3, marginTop: 1 },
  scroll: { paddingHorizontal: 15, paddingTop: 20 },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    alignItems: 'center',
    shadowColor: 'rgba(40,30,80,1)', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055, shadowRadius: 14, elevation: 3,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.ink, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 13, color: C.ink3, textAlign: 'center', lineHeight: 20 },
});
