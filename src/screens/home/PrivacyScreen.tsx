/**
 * PrivacyScreen — M2
 *
 * Privacy and photos settings. Controls who can see photos and
 * shows always-on privacy protections.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
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
  getMyProfile,
  updatePhotoPrivacy,
  PHOTO_PRIVACY_OPTIONS,
  type PhotoVisibilityMode,
} from '../../api/profile';

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  rose:      '#E6396E',
  roseInk:   '#A31C48',
  roseSoft:  '#FDECF2',
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  indBody:   '#4B4384',
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

// ─── icons ────────────────────────────────────────────────────────────────────
function ChevLeft() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

function LockIcon({ color = C.ink2 }: { color?: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={11} width={16} height={10} rx={2.5} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

function EyeIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}

// ─── toggle ───────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle?: () => void }) {
  return (
    <Pressable onPress={onToggle} style={[styles.tg, on && styles.tgOn]}>
      <View style={[styles.tgThumb, on && styles.tgThumbOn]} />
    </Pressable>
  );
}

// ─── banner ───────────────────────────────────────────────────────────────────
type BannerVariant = 'mint' | 'gold' | 'ind' | 'rose';

const BANNER_COLORS: Record<BannerVariant, { bg: string; title: string; body: string }> = {
  mint: { bg: C.mintSoft, title: C.mintInk,  body: '#237A5C' },
  gold: { bg: C.goldSoft, title: C.goldInk,  body: '#8A6410' },
  ind:  { bg: C.indSoft,  title: C.indInk,   body: C.indBody },
  rose: { bg: C.roseSoft, title: C.roseInk,  body: '#B03258' },
};

function Banner({ variant, icon, title, body }: {
  variant: BannerVariant;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const colors = BANNER_COLORS[variant];
  return (
    <View style={[styles.banner, { backgroundColor: colors.bg }]}>
      <View style={styles.bannerIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color: colors.title }]}>{title}</Text>
        <Text style={[styles.bannerBody, { color: colors.body }]}>{body}</Text>
      </View>
    </View>
  );
}

// ─── section header ───────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.shead}>{label}</Text>;
}

// ─── radio option ─────────────────────────────────────────────────────────────
function RadioOption({ selected, title, subtitle, onPress }: {
  selected: boolean;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.opt, pressed && { opacity: 0.75 }]}>
      <View style={[styles.rad, selected && styles.radOn]}>
        {selected && (
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12.5l5 5 9-10" />
          </Svg>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.lit, selected && styles.litSelected]}>{title}</Text>
        <Text style={styles.lis}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

// ─── data row ─────────────────────────────────────────────────────────────────
function DataRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={[styles.dataRow, first && styles.dataRowFirst]}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
interface PrivacyScreenProps {
  onBack?: () => void;
  onYourPhotos?: () => void;
  /** Current wali's name — shown in option subtitle */
  waliName?: string;
  /** Currently saved pause state from backend */
  /** Called with new visibility value when user changes it */
  /** Called with new pause state when user toggles it */
}

// ─── screen ───────────────────────────────────────────────────────────────────
export function PrivacyScreen({
  onBack,
  onYourPhotos,
  waliName,
}: PrivacyScreenProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<PhotoVisibilityMode>('NOBODY');
  const [pauseRequests, setPauseRequests] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then(profile => {
        const privacy = profile.privacySettings;
        if (privacy?.photoVisibilityMode) setMode(privacy.photoVisibilityMode);
        if (privacy?.photoRequestsPaused != null) {
          setPauseRequests(privacy.photoRequestsPaused);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>Privacy and photos</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        <Banner
          variant="ind"
          icon={<ShieldIcon color={C.indInk} />}
          title="Your profile is private by default"
          body="You are not listed anywhere and cannot be browsed. These settings only control the photo step."
        />

        <SectionHeader label="Who can see your photos" />
        <View style={[styles.card, styles.cardOverflow]}>
          {PHOTO_PRIVACY_OPTIONS.map((opt, i) => (
            <View key={opt.mode} style={i > 0 && styles.optDivider}>
              <RadioOption
                selected={mode === opt.mode}
                title={opt.title}
                subtitle={opt.subtitle}
                onPress={() => {
                  const previous = mode;
                  setMode(opt.mode);
                  updatePhotoPrivacy({ photoVisibilityMode: opt.mode }).catch(
                    err => {
                      setMode(previous);
                      const msg =
                        err instanceof Error
                          ? err.message
                          : 'Could not save. Please try again.';
                      Alert.alert('Could not save', msg);
                    },
                  );
                }}
              />
            </View>
          ))}
        </View>

        <SectionHeader label="Always on" />
        <View style={styles.card}>
          <View style={styles.rows}>
            <DataRow label="Screenshots"          value="Blocked"              first />
            <DataRow label="Your exact area"      value="Never shown"          />
            <DataRow label="Your contact details" value="Never shown"          />
            <DataRow label="Your full name"        value="After wali approval"  />
          </View>
          <View style={styles.lock}>
            <View style={styles.lockIcon}><LockIcon /></View>
            <Text style={styles.lockText}>
              These are not settings. They apply to every member and cannot be switched off by anyone.
            </Text>
          </View>
        </View>

        <SectionHeader label="Photo requests" />
        <View style={[styles.card, styles.cardOverflow]}>
          <View style={styles.li}>
            <View style={[styles.lic, { backgroundColor: C.goldSoft }]}>
              <EyeIcon color={C.goldInk} />
            </View>
            <View style={styles.lib}>
              <Text style={styles.lit}>Pause photo requests</Text>
              <Text style={styles.lis}>Stop receiving new requests for now</Text>
            </View>
            <Toggle
              on={pauseRequests}
              onToggle={() => {
                const next = !pauseRequests;
                setPauseRequests(next);
                updatePhotoPrivacy({ photoRequestsPaused: next }).catch(err => {
                  setPauseRequests(!next);
                  const msg =
                    err instanceof Error
                      ? err.message
                      : 'Could not save. Please try again.';
                  Alert.alert('Could not save', msg);
                });
              }}
            />
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

  // Radio option
  opt: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'flex-start',
    padding: 15,
    paddingHorizontal: 16,
  },
  optDivider: {
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  rad: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#DAD6E8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  radOn: {
    borderColor: C.rose,
    backgroundColor: C.rose,
  },
  lit: {
    fontSize: 14.5,
    fontWeight: '600',
    color: C.ink,
  },
  litSelected: {
    color: C.ink,
  },
  lis: {
    fontSize: 12,
    color: C.ink3,
    lineHeight: 17.4,
    marginTop: 2,
  },

  // Data rows ("Always on" section)
  rows: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
  },
  dataValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: C.ink,
    textAlign: 'right',
  },

  // Lock notice
  lock: {
    margin: 13,
    marginTop: 8,
    backgroundColor: '#F7F6FB',
    borderRadius: 15,
    padding: 12,
    paddingHorizontal: 13,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
  },
  lockIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  lockText: {
    fontSize: 12,
    color: C.ink2,
    lineHeight: 18.6,
    flex: 1,
  },

  // List item (for photo requests)
  li: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
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

  // Toggle
  tg: {
    width: 44,
    height: 26,
    borderRadius: 14,
    backgroundColor: '#E2E0EC',
    justifyContent: 'center',
    paddingHorizontal: 3,
    flexShrink: 0,
  },
  tgOn: {
    backgroundColor: '#17B07E',
  },
  tgThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tgThumbOn: {
    alignSelf: 'flex-end',
  },
});
