/**
 * LanguageScreen
 *
 * Select app language: English or Urdu.
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
import Svg, { Path } from 'react-native-svg';

const C = {
  rose:    '#E6396E',
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

function CheckIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={C.rose} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l5 5 9-10" />
    </Svg>
  );
}

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
] as const;

type LangCode = typeof LANGUAGES[number]['code'];

interface LanguageScreenProps {
  onBack?: () => void;
}

export function LanguageScreen({ onBack }: LanguageScreenProps) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<LangCode>('en');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>Language</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          {LANGUAGES.map((lang, i) => (
            <Pressable
              key={lang.code}
              onPress={() => setSelected(lang.code)}
              style={({ pressed }) => [
                styles.row,
                i === 0 && styles.rowFirst,
                pressed && { opacity: 0.75 },
              ]}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{lang.label}</Text>
                <Text style={styles.rowNative}>{lang.native}</Text>
              </View>
              {selected === lang.code && <CheckIcon />}
            </Pressable>
          ))}
        </View>

        <Text style={styles.hint}>
          Language changes take effect immediately.
        </Text>
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
  scroll: { paddingHorizontal: 15, paddingTop: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 24,
    shadowColor: 'rgba(40,30,80,1)', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055, shadowRadius: 14, elevation: 3, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 18,
    borderTopWidth: 1, borderTopColor: C.line,
  },
  rowFirst: { borderTopWidth: 0 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: C.ink },
  rowNative: { fontSize: 13, color: C.ink3, marginTop: 2 },
  hint: {
    fontSize: 12, color: C.ink3, textAlign: 'center',
    marginTop: 16, lineHeight: 18,
  },
});
