/**
 * WaliSettingsScreen
 *
 * Settings screen shown exclusively to wali users.
 * Contains only wali-relevant options — no seeker biodata/preferences/membership.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  rose:      '#E6396E',
  roseInk:   '#A31C48',
  roseSoft:  '#FDECF2',
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  mint:      '#17B07E',
  mintSoft:  '#E5F6F0',
  mintInk:   '#0A5C43',
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
function ChevRight() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={C.chev} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

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
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={C.mint} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l5 5 9-10" />
    </Svg>
  );
}

type IconName = 'bell' | 'globe' | 'help' | 'doc' | 'down' | 'out' | 'trash' | 'fam';

function Icon({ name, color }: { name: IconName; color: string }) {
  const props = {
    width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none' as const,
    stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'bell':
      return <Svg {...props}><Path d="M18 15V10a6 6 0 1 0-12 0v5l-2 3h16z" /><Path d="M10 21h4" /></Svg>;
    case 'globe':
      return <Svg {...props}><Circle cx={12} cy={12} r={9} /><Path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" /></Svg>;
    case 'help':
      return <Svg {...props}><Circle cx={12} cy={12} r={9} /><Path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3M12 17h.01" /></Svg>;
    case 'doc':
      return <Svg {...props}><Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><Path d="M14 3v5h5" /></Svg>;
    case 'down':
      return <Svg {...props}><Path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 20h14" /></Svg>;
    case 'out':
      return <Svg {...props}><Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h11" /></Svg>;
    case 'trash':
      return <Svg {...props}><Path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" /></Svg>;
    case 'fam':
      return <Svg {...props}><Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><Circle cx={9} cy={7} r={3.5} /><Path d="M22 21v-2a4 4 0 0 0-3-3.87" /></Svg>;
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────
type IconBg = 'rose' | 'indigo' | 'mint' | 'gold' | 'grey';

const BG_MAP: Record<IconBg, { bg: string; icon: string }> = {
  rose:   { bg: C.roseSoft, icon: C.roseInk },
  indigo: { bg: C.indSoft,  icon: C.indInk  },
  mint:   { bg: C.mintSoft, icon: C.mintInk },
  gold:   { bg: '#FBF2DE',  icon: '#B5820D' },
  grey:   { bg: C.greySoft, icon: C.greyInk },
};

interface ListItemProps {
  iconName: IconName;
  iconBg: IconBg;
  title: string;
  subtitle?: string;
  value?: string;
  first?: boolean;
  danger?: boolean;
  loading?: boolean;
  onPress?: () => void;
}

function ListItem({ iconName, iconBg, title, subtitle, value, first, danger, loading, onPress }: ListItemProps) {
  const { bg, icon } = BG_MAP[iconBg];
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      style={({ pressed }) => [styles.li, first && styles.liFirst, pressed && !loading && { opacity: 0.7 }]}>
      <View style={[styles.lic, { backgroundColor: bg }]}>
        <Icon name={iconName} color={icon} />
      </View>
      <View style={styles.lib}>
        <Text style={[styles.lit, danger && styles.litDanger]}>{title}</Text>
        {!!subtitle && <Text style={styles.lis}>{subtitle}</Text>}
      </View>
      {!!value && <Text style={styles.liv}>{value}</Text>}
      {loading
        ? <ActivityIndicator size="small" color={danger ? '#D9304F' : '#9B7BF0'} />
        : <ChevRight />}
    </Pressable>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.shead}>{label}</Text>;
}

// ─── props ────────────────────────────────────────────────────────────────────
interface WaliSettingsScreenProps {
  onBack?: () => void;
  onNotifications?: () => void;
  onLanguage?: () => void;
  onContactSupport?: () => void;
  onPrivacyPolicy?: () => void;
  onTermsOfService?: () => void;
  onSignOut?: () => Promise<void>;
  onDeleteAccount?: () => void;
  waliName?: string;
  waliEmail?: string;
  dependentName?: string;
}

// ─── screen ───────────────────────────────────────────────────────────────────
export function WaliSettingsScreen({
  onBack,
  onNotifications,
  onLanguage,
  onContactSupport,
  onPrivacyPolicy,
  onTermsOfService,
  onSignOut,
  onDeleteAccount,
  waliName = 'Wali',
  waliEmail,
  dependentName,
}: WaliSettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <View style={styles.card}>
          <View style={styles.prof}>
            <View style={styles.pav}>
              <Text style={styles.pavText}>
                {waliName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'W'}
              </Text>
            </View>
            <View style={styles.pnRow}>
              <Text style={styles.pn}>{waliName}</Text>
              <CheckIcon />
            </View>
            {!!waliEmail && <Text style={styles.pe}>{waliEmail}</Text>}
            <Text style={styles.ps}>
              Wali{dependentName ? ` for ${dependentName}` : ''}
            </Text>
          </View>
        </View>

        <SectionHeader label="Preferences" />
        <View style={[styles.card, styles.cardOverflow]}>
          <ListItem first iconName="bell"  iconBg="gold"  title="Notifications" onPress={onNotifications} />
        </View>

        <SectionHeader label="Help and legal" />
        <View style={[styles.card, styles.cardOverflow]}>
          <ListItem first iconName="help" iconBg="grey" title="Contact support"  onPress={onContactSupport} />
          <ListItem       iconName="doc"  iconBg="grey" title="Privacy policy"   onPress={onPrivacyPolicy} />
          <ListItem       iconName="doc"  iconBg="grey" title="Terms of service" onPress={onTermsOfService} />
        </View>

        <SectionHeader label="Account" />
        <View style={[styles.card, styles.cardOverflow]}>
          <ListItem
            first
            iconName="out"
            iconBg="grey"
            title="Sign out"
            loading={signingOut}
            onPress={async () => {
              setSigningOut(true);
              try { await onSignOut?.(); } finally { setSigningOut(false); }
            }}
          />
          <ListItem iconName="trash" iconBg="rose" title="Delete account" danger onPress={onDeleteAccount} />
        </View>

      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.page },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 13,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(40,30,80,0.07)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2, flexShrink: 0,
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: C.ink },
  scroll: { paddingHorizontal: 15, paddingTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 24,
    shadowColor: 'rgba(40,30,80,1)', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055, shadowRadius: 14, elevation: 3, marginBottom: 13,
  },
  cardOverflow: { overflow: 'hidden' },
  shead: {
    fontSize: 11.5, fontWeight: '700', letterSpacing: 0.9,
    textTransform: 'uppercase', color: C.ink3,
    paddingVertical: 4, paddingHorizontal: 6, paddingBottom: 9,
  },
  prof: { alignItems: 'center', paddingTop: 20, paddingBottom: 20, paddingHorizontal: 18 },
  pav: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: C.indSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  pavText: { fontSize: 24, fontWeight: '700', color: C.indInk },
  pnRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pn: { fontSize: 20, fontWeight: '700', color: C.ink },
  pe: { fontSize: 13, color: C.ink3, marginTop: 2 },
  ps: { fontSize: 12, color: C.ink3, marginTop: 2 },
  li: {
    flexDirection: 'row', gap: 13, alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: C.line,
  },
  liFirst: { borderTopWidth: 0 },
  lic: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lib: { flex: 1 },
  lit: { fontSize: 14.5, fontWeight: '600', color: C.ink },
  litDanger: { color: C.roseInk },
  lis: { fontSize: 12, color: C.ink3, lineHeight: 17.4, marginTop: 1 },
  liv: { fontSize: 13, fontWeight: '600', color: C.ink3 },
});
