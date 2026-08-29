/**
 * SettingsScreen — M1
 *
 * Main settings/menu screen. Shows profile summary, search settings,
 * account options, help/legal links, and account-leaving actions.
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

// ─── icon components ──────────────────────────────────────────────────────────
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

type IconName =
  | 'heart' | 'fam' | 'lock' | 'card' | 'bell' | 'globe'
  | 'ban' | 'help' | 'doc' | 'ring' | 'down' | 'out' | 'trash';

function Icon({ name, color }: { name: IconName; color: string }) {
  const props = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none' as const,
    stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'heart':
      return <Svg {...props}><Path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20z" /></Svg>;
    case 'fam':
      return <Svg {...props}><Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><Circle cx={9} cy={7} r={3.5}/><Path d="M22 21v-2a4 4 0 0 0-3-3.87"/></Svg>;
    case 'lock':
      return <Svg {...props}><Rect x={4} y={11} width={16} height={10} rx={2.5}/><Path d="M8 11V7a4 4 0 0 1 8 0v4"/></Svg>;
    case 'card':
      return <Svg {...props}><Rect x={2} y={5} width={20} height={14} rx={3}/><Path d="M2 10h20"/></Svg>;
    case 'bell':
      return <Svg {...props}><Path d="M18 15V10a6 6 0 1 0-12 0v5l-2 3h16z"/><Path d="M10 21h4"/></Svg>;
    case 'globe':
      return <Svg {...props}><Circle cx={12} cy={12} r={9}/><Path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/></Svg>;
    case 'ban':
      return <Svg {...props}><Circle cx={12} cy={12} r={9}/><Path d="M5.6 5.6l12.8 12.8"/></Svg>;
    case 'help':
      return <Svg {...props}><Circle cx={12} cy={12} r={9}/><Path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3M12 17h.01"/></Svg>;
    case 'doc':
      return <Svg {...props}><Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><Path d="M14 3v5h5"/></Svg>;
    case 'ring':
      return <Svg {...props}><Path d="M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"/><Path d="M9 8l1.5-4h3L15 8"/></Svg>;
    case 'down':
      return <Svg {...props}><Path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 20h14"/></Svg>;
    case 'out':
      return <Svg {...props}><Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h11"/></Svg>;
    case 'trash':
      return <Svg {...props}><Path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/></Svg>;
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────
type IconBg = 'rose' | 'indigo' | 'mint' | 'gold' | 'grey';

const BG_MAP: Record<IconBg, { bg: string; icon: string }> = {
  rose:   { bg: C.roseSoft,  icon: C.roseInk },
  indigo: { bg: C.indSoft,   icon: C.indInk  },
  mint:   { bg: C.mintSoft,  icon: C.mintInk },
  gold:   { bg: C.goldSoft,  icon: C.goldInk },
  grey:   { bg: C.greySoft,  icon: C.greyInk },
};

interface ListItemProps {
  iconName: IconName;
  iconBg: IconBg;
  title: string;
  subtitle?: string;
  value?: string;
  first?: boolean;
  danger?: boolean;
  onPress?: () => void;
}

function ListItem({ iconName, iconBg, title, subtitle, value, first, danger, onPress }: ListItemProps) {
  const { bg, icon } = BG_MAP[iconBg];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.li, first && styles.liFirst, pressed && { opacity: 0.7 }]}>
      <View style={[styles.lic, { backgroundColor: bg }]}>
        <Icon name={iconName} color={icon} />
      </View>
      <View style={styles.lib}>
        <Text style={[styles.lit, danger && styles.litDanger]}>{title}</Text>
        {!!subtitle && <Text style={styles.lis}>{subtitle}</Text>}
      </View>
      {!!value && <Text style={styles.liv}>{value}</Text>}
      <ChevRight />
    </Pressable>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.shead}>{label}</Text>;
}

// ─── props ────────────────────────────────────────────────────────────────────
interface SettingsScreenProps {
  onBack?: () => void;
  onViewBiodata?: () => void;
  onEdit?: () => void;
  onPartnerPreferences?: () => void;
  onWali?: () => void;
  onPrivacy?: () => void;
  onMembership?: () => void;
  onNotifications?: () => void;
  onLanguage?: () => void;
  onBlockedPeople?: () => void;
  onContactSupport?: () => void;
  onPrivacyPolicy?: () => void;
  onTermsOfService?: () => void;
  onRefundPolicy?: () => void;
  onFoundMyMatch?: () => void;
  onDownloadData?: () => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
  userName?: string;
  userCity?: string;
}

// ─── screen ───────────────────────────────────────────────────────────────────
export function SettingsScreen({
  onBack,
  onViewBiodata,
  onEdit,
  onPartnerPreferences,
  onWali,
  onPrivacy,
  onMembership,
  onNotifications,
  onLanguage,
  onBlockedPeople,
  onContactSupport,
  onPrivacyPolicy,
  onTermsOfService,
  onRefundPolicy,
  onFoundMyMatch,
  onDownloadData,
  onSignOut,
  onDeleteAccount,
  userName = 'Mian Haseeb',
  userCity = 'Lahore',
}: SettingsScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar — pinned */}
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
              <Text style={styles.pavText}>MH</Text>
            </View>
            <View style={styles.pnRow}>
              <Text style={styles.pn}>{userName}</Text>
              <CheckIcon />
            </View>
            <Text style={styles.ps}>{userCity} · Member since August</Text>
          </View>
          <View style={styles.acts}>
            <Pressable
              onPress={onViewBiodata}
              style={({ pressed }) => [styles.btn, styles.btnO, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.btnText, { color: C.indInk }]}>View your biodata</Text>
            </Pressable>
          </View>
        </View>

        <SectionHeader label="Your search" />
        <View style={[styles.card, styles.cardOverflow]}>
          <ListItem first iconName="heart" iconBg="rose"   title="Partner preferences" subtitle="6 profiles match right now" onPress={onPartnerPreferences} />
          <ListItem       iconName="fam"   iconBg="indigo" title="Your wali"            subtitle="Imran Mian · active"         onPress={onWali} />
          <ListItem       iconName="lock"  iconBg="indigo" title="Privacy and photos"   subtitle="Photos: nobody without approval" onPress={onPrivacy} />
        </View>

        <SectionHeader label="Account" />
        <View style={[styles.card, styles.cardOverflow]}>
          <ListItem first iconName="card"  iconBg="mint"   title="Membership"       subtitle="Paid 26 August · no renewal" onPress={onMembership} />
          <ListItem       iconName="bell"  iconBg="gold"   title="Notifications"                                           onPress={onNotifications} />
          <ListItem       iconName="globe" iconBg="grey"   title="Language"         value="English"                        onPress={onLanguage} />
          <ListItem       iconName="ban"   iconBg="grey"   title="Blocked people"   value="0"                              onPress={onBlockedPeople} />
        </View>

        <SectionHeader label="Help and legal" />
        <View style={[styles.card, styles.cardOverflow]}>
          <ListItem first iconName="help" iconBg="grey" title="Contact support"   onPress={onContactSupport} />
          <ListItem       iconName="doc"  iconBg="grey" title="Privacy policy"    onPress={onPrivacyPolicy} />
          <ListItem       iconName="doc"  iconBg="grey" title="Terms of service"  onPress={onTermsOfService} />
          <ListItem       iconName="doc"  iconBg="grey" title="Refund policy"     onPress={onRefundPolicy} />
        </View>

        <SectionHeader label="Leaving" />
        <View style={[styles.card, styles.cardOverflow]}>
          <ListItem first iconName="ring"  iconBg="mint" title="I found my match"    subtitle="Archive your profile and tell us" onPress={onFoundMyMatch} />
          <ListItem       iconName="down"  iconBg="grey" title="Download my data"                                                onPress={onDownloadData} />
          <ListItem       iconName="out"   iconBg="grey" title="Sign out"                                                        onPress={onSignOut} />
          <ListItem       iconName="trash" iconBg="rose" title="Delete account" danger                                           onPress={onDeleteAccount} />
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

  // Profile header
  prof: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 18,
  },
  pav: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: C.indSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pavText: {
    fontSize: 25,
    fontWeight: '700',
    color: C.indInk,
  },
  pnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pn: {
    fontSize: 21,
    fontWeight: '700',
    color: C.ink,
  },
  ps: {
    fontSize: 13,
    color: C.ink3,
    marginTop: 3,
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
    paddingHorizontal: 8,
  },
  btnG: {
    backgroundColor: '#F2F1F7',
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
  litDanger: {
    color: C.roseInk,
  },
  lis: {
    fontSize: 12,
    color: C.ink3,
    lineHeight: 17.4,
    marginTop: 1,
  },
  liv: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink3,
  },
});
