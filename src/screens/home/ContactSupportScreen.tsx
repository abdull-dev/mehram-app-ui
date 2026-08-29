/**
 * ContactSupportScreen
 *
 * Contact options: email, WhatsApp.
 */

import React from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const C = {
  rose:    '#E6396E',
  indInk:  '#332C66',
  indSoft: '#EEECF8',
  mintSoft:'#E5F6F0',
  mintInk: '#0A5C43',
  goldSoft:'#FBF2DE',
  goldInk: '#B5820D',
  greySoft:'#F2F1F7',
  greyInk: '#6E6B80',
  page:    '#F6F5FA',
  line:    '#EEEDF3',
  ink:     '#17171F',
  ink2:    '#5F5E70',
  ink3:    '#9695A5',
  chev:    '#C6C4D2',
} as const;

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
      stroke={C.chev} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}
function MailIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={2} y={4} width={20} height={16} rx={2} />
      <Path d="M2 7l10 6 10-6" />
    </Svg>
  );
}
function ChatIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}
function HelpIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3M12 17h.01" />
    </Svg>
  );
}

function ListItem({
  icon, bg, title, subtitle, onPress, first,
}: {
  icon: React.ReactNode; bg: string; title: string; subtitle?: string;
  onPress?: () => void; first?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.li, first && styles.liFirst, pressed && { opacity: 0.75 }]}>
      <View style={[styles.lic, { backgroundColor: bg }]}>{icon}</View>
      <View style={styles.lib}>
        <Text style={styles.lit}>{title}</Text>
        {subtitle ? <Text style={styles.lis}>{subtitle}</Text> : null}
      </View>
      <ChevRight />
    </Pressable>
  );
}

interface ContactSupportScreenProps {
  onBack?: () => void;
}

export function ContactSupportScreen({ onBack }: ContactSupportScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>Contact support</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        <View style={[styles.banner, { backgroundColor: C.indSoft }]}>
          <HelpIcon color={C.indInk} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: C.indInk }]}>We usually reply within a few hours</Text>
            <Text style={[styles.bannerBody, { color: '#4B4384' }]}>
              For urgent matters, WhatsApp is faster.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <ListItem
            icon={<MailIcon color={C.indInk} />}
            bg={C.indSoft}
            title="Email us"
            subtitle="support@mehram.app"
            onPress={() => Linking.openURL('mailto:support@mehram.app')}
            first
          />
          <ListItem
            icon={<ChatIcon color={C.mintInk} />}
            bg={C.mintSoft}
            title="WhatsApp"
            subtitle="Chat with us directly"
            onPress={() => Linking.openURL('https://wa.me/923001234567')}
          />
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
    backgroundColor: '#fff', borderRadius: 24,
    shadowColor: 'rgba(40,30,80,1)', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055, shadowRadius: 14, elevation: 3, overflow: 'hidden',
  },
  li: {
    flexDirection: 'row', gap: 13, alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: C.line,
  },
  liFirst: { borderTopWidth: 0 },
  lic: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lib: { flex: 1 },
  lit: { fontSize: 14.5, fontWeight: '600', color: C.ink },
  lis: { fontSize: 12, color: C.ink3, lineHeight: 17.4, marginTop: 2 },
});
