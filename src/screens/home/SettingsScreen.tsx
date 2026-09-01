/**
 * SettingsScreen — M1
 *
 * Main settings/menu screen. Shows profile summary, search settings,
 * account options, help/legal links, and account-leaving actions.
 *
 * The profile card and the row subtitles used to be the prototype's sample text
 * — "Mian Haseeb", "MH", "Lahore · Member since August", a wali called "Imran
 * Mian", "6 profiles match right now". They were prop defaults and inline
 * literals, so they rendered for every real user as if they were that user's
 * details. Everything shown here now comes from the profile, the family status
 * or the caller, and anything unknown is left out rather than filled in.
 */

import React, { useEffect, useState } from 'react';
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
import {
  PHOTO_PRIVACY_OPTIONS,
  getMyProfile,
  type MyProfile,
} from '../../api/profile';
import { getFamilyStatus, type WaliMember } from '../../api/wali';
import { getMe, type MeResponse } from '../../api/auth';
import { Bone } from '../../components/ui/Skeleton';

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

/** Avatar stand-in while the name is still loading, or absent entirely. */
function PersonIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={3.6} />
      <Path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
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
  loading?: boolean;
  /**
   * The subtitle is still being fetched — show a bone in its place.
   *
   * Distinct from `loading`, which means the row's own action is running and
   * puts a spinner where the chevron goes.
   */
  subtitlePending?: boolean;
  onPress?: () => void;
}

function ListItem({
  iconName, iconBg, title, subtitle, value, first, danger, loading, subtitlePending, onPress,
}: ListItemProps) {
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
        {subtitlePending ? (
          <Bone w={140} h={11} radius={5} style={styles.boneSubtitle} />
        ) : (
          !!subtitle && <Text style={styles.lis}>{subtitle}</Text>
        )}
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
  onSignOut?: () => Promise<void>;
  /**
   * The user's full name, when the caller already knows it. Left undefined, the
   * screen uses the name on the fetched profile.
   */
  userName?: string;
  /** True only when verification came back APPROVED — drives the tick. */
  verified?: boolean;
  /** Profiles currently matching the user's preferences, from the home state. */
  matchCount?: number;
  /** Whether the membership has been paid for. */
  isPaidMember?: boolean;
}

/** Up to two initials for the avatar, or null when there is no name to use. */
function initialsOf(fullName?: string | null): string | null {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.slice(0, 2).map(w => w[0]!.toUpperCase()).join('');
}

/** "Member since August 2026" — month and year, so it does not go stale. */
function memberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Member since ${date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })}`;
}

// ─── screen ───────────────────────────────────────────────────────────────────
/**
 * Module-level cache, so reopening Settings shows the previous answer at once
 * instead of a screen of skeletons on every visit.
 *
 * The screen still refetches in the background on each open; the cache only
 * decides whether the user waits to see anything. Cleared on sign-out by
 * `resetSettingsCache` — it holds a name and an email, and the next account to
 * sign in on this device must not see them.
 */
let _cachedProfile: MyProfile | null = null;
let _cachedAccount: MeResponse | null = null;
let _cachedWali: WaliMember | null = null;
let _settingsLoaded = false;

export function resetSettingsCache(): void {
  _cachedProfile = null;
  _cachedAccount = null;
  _cachedWali = null;
  _settingsLoaded = false;
}

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
  onSignOut,
  userName,
  verified = false,
  matchCount,
  isPaidMember,
}: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);

  // Fetched here rather than threaded down from App: the name, city, join date
  // and photo-privacy mode are all on the profile, and nothing above this screen
  // was holding them.
  const [profile, setProfile] = useState<MyProfile | null>(_cachedProfile);
  const [account, setAccount] = useState<MeResponse | null>(_cachedAccount);
  const [wali, setWali] = useState<WaliMember | null>(_cachedWali);
  // Skeletons are for a first visit only. On a revisit the cached values are
  // already on screen, and flashing bones over them reads as data being lost.
  const [loading, setLoading] = useState(!_settingsLoaded);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getMyProfile().catch(() => null),
      // The name and email come from here. `/profile/me` declares `fullName`
      // but does not return one — which is why the card rendered a city and no
      // name — and it carries no email at all.
      getMe().catch(() => null),
      // A user with no wali is the normal answer here, not a failure.
      getFamilyStatus().catch(() => null),
    ]).then(([me, auth, family]) => {
      if (cancelled) return;
      _cachedProfile = me;
      _cachedAccount = auth;
      _cachedWali = family;
      _settingsLoaded = true;
      setProfile(me);
      setAccount(auth);
      setWali(family);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const fullName =
    userName?.trim() ||
    account?.profile.fullName?.trim() ||
    profile?.fullName?.trim() ||
    '';
  const email = account?.user.email?.trim();
  const initials = initialsOf(fullName);
  const since = memberSince(profile?.onboardingCompletedAt);
  const city = profile?.city?.trim();
  // Each half is dropped when unknown, so a missing city cannot leave a stray
  // separator behind.
  const metaLine = [city, since].filter(Boolean).join(' · ');

  const privacyMode = profile?.privacySettings?.photoVisibilityMode;
  const privacySubtitle = privacyMode
    ? `Photos: ${
        PHOTO_PRIVACY_OPTIONS.find(o => o.mode === privacyMode)?.chipLabel ?? privacyMode
      }`
    : undefined;

  const waliSubtitle = loading
    ? undefined
    : wali
      ? `${wali.wali.fullName} · active`
      : 'Not added yet';

  const preferencesSubtitle =
    matchCount != null && matchCount > 0
      ? `${matchCount} ${matchCount === 1 ? 'profile matches' : 'profiles match'} right now`
      : undefined;

  const membershipSubtitle =
    isPaidMember == null
      ? undefined
      : isPaidMember
        ? 'Active · one-time payment'
        : 'Not a member yet';

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
            {/* While the fetch is in flight the real layout would collapse to a
                bare avatar and then jump as the name, email and city arrive.
                Bones hold the same shape so the card only fills in. */}
            <View style={styles.pav}>
              {loading ? null : initials ? (
                <Text style={styles.pavText}>{initials}</Text>
              ) : (
                <PersonIcon />
              )}
            </View>
            {loading ? (
              <>
                <Bone w={168} h={21} radius={7} style={styles.boneName} />
                <Bone w={196} h={13} radius={6} style={styles.boneEmail} />
                <Bone w={110} h={13} radius={6} style={styles.boneMeta} />
              </>
            ) : (
              <>
                {!!fullName && (
                  <View style={styles.pnRow}>
                    <Text style={styles.pn}>{fullName}</Text>
                    {/* Only a profile the server actually approved gets the tick. */}
                    {verified && <CheckIcon />}
                  </View>
                )}
                {!!email && <Text style={styles.pe}>{email}</Text>}
                {!!metaLine && <Text style={styles.ps}>{metaLine}</Text>}
              </>
            )}
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
          <ListItem first iconName="heart" iconBg="rose"   title="Partner preferences" subtitle={preferencesSubtitle} onPress={onPartnerPreferences} />
          <ListItem       iconName="fam"   iconBg="indigo" title="Your wali"            subtitle={waliSubtitle}    subtitlePending={loading} onPress={onWali} />
          <ListItem       iconName="lock"  iconBg="indigo" title="Privacy and photos"   subtitle={privacySubtitle} subtitlePending={loading} onPress={onPrivacy} />
        </View>

        <SectionHeader label="Account" />
        <View style={[styles.card, styles.cardOverflow]}>
          <ListItem first iconName="card"  iconBg="mint"   title="Membership"       subtitle={membershipSubtitle} onPress={onMembership} />
          <ListItem       iconName="bell"  iconBg="gold"   title="Notifications"                                           onPress={onNotifications} />
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
          {/* Sign out is the only row here now: "I found my match", "Download
              my data" and "Delete account" were removed along with their
              screens and endpoints. */}
          <ListItem first iconName="out" iconBg="grey" title="Sign out" loading={signingOut} onPress={async () => { setSigningOut(true); try { await onSignOut?.(); } finally { setSigningOut(false); } }} />
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
  pe: {
    fontSize: 13,
    color: C.ink2,
    marginTop: 4,
  },
  // Margins mirror pn / pe / ps so the card does not resize when the real text
  // replaces the bones.
  boneName: { marginTop: 3 },
  boneEmail: { marginTop: 7 },
  boneMeta: { marginTop: 6 },
  boneSubtitle: { marginTop: 5 },
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
