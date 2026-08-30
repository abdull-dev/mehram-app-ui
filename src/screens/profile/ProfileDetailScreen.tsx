/**
 * ProfileDetailScreen — P2: Full profile view
 *
 * Opened when the user taps "View profile" on the H16 introduction card.
 *
 *   ┌──────────────────────────────────────┐
 *   │  ← Back              Profile         │
 *   ├──────────────────────────────────────┤
 *   │  [Photo placeholder — 260px tall]    │
 *   │  27 · Lahore                         │
 *   │  Sunni (Hanafi) · Practicing         │
 *   │  [ID verified] [Wali registered]     │
 *   ├──────────────────────────────────────┤
 *   │  🔒 Photo not yet available          │
 *   │  Send a proposal first…              │
 *   │  [   Request photo update   ]        │  ← violet gradient
 *   ├──────────────────────────────────────┤
 *   │  Profile details                     │
 *   │  Education       Master's degree     │
 *   │  Profession      Healthcare          │
 *   │  Height          5ft 4in             │
 *   │  Marital status  Single              │
 *   │  Family          Joint family        │
 *   ├──────────────────────────────────────┤
 *   │  [Not suitable]                      │
 *   │  [      Send proposal      ]         │  ← rose gradient
 *   └──────────────────────────────────────┘
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const PHOTO_SLIDE_W = Dimensions.get('window').width - 32; // full content width (16px padding each side)
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors } from '../../theme/colors';
import { IntroductionProfile } from '../../components/introduction/IntroductionAvailableBlock';

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={Colors.ink}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PersonIcon() {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke="#9A93C4" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 21v-1a7 7 0 0 1 16 0v1" stroke="#9A93C4" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={11} width={16} height={10} rx={2.5} stroke={Colors.vio} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={Colors.vio} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={4} stroke="#fff" strokeWidth={1.8} />
    </Svg>
  );
}

function ShieldCheckIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L3 7v5c0 5.25 3.9 10.74 9 12 5.1-1.26 9-6.75 9-12V7L12 2z"
        stroke={Colors.mintInk}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 12l2 2 4-4" stroke={Colors.mintInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UsersIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={Colors.vioInk} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={9} cy={7} r={4} stroke={Colors.vioInk} strokeWidth={2} />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={Colors.vioInk} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── badge ────────────────────────────────────────────────────────────────────
function Badge({ label, variant }: { label: string; variant: 'mint' | 'indigo' }) {
  const bg    = variant === 'mint' ? Colors.mintSoft : Colors.vioSoft;
  const color = variant === 'mint' ? Colors.mintInk  : Colors.vioInk;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {variant === 'mint' ? <ShieldCheckIcon /> : <UsersIcon />}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── photo carousel (wali view) ───────────────────────────────────────────────
function PhotoCarousel({ urls }: { urls: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (urls.length === 0) {
    return (
      <View style={styles.photoWrap}>
        <View style={styles.photoInner}>
          <PersonIcon />
          <Text style={styles.photoHintText}>No photos uploaded yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.photoWrap, { overflow: 'hidden' }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / PHOTO_SLIDE_W);
            setActiveIndex(idx);
          }}>
          {urls.map((url, i) => (
            <Image
              key={i}
              source={{ uri: url }}
              style={{ width: PHOTO_SLIDE_W, height: 268 }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      </View>
      {urls.length > 1 && (
        <View style={carouselStyles.dots}>
          {urls.map((_, i) => (
            <View key={i} style={[carouselStyles.dot, i === activeIndex && carouselStyles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── profile row ──────────────────────────────────────────────────────────────
function ProfileRow({ label, value, first = false }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={[styles.profileRow, !first && styles.profileRowBorder]}>
      <Text style={styles.profileRowLabel}>{label}</Text>
      <Text style={styles.profileRowValue}>{value}</Text>
    </View>
  );
}

/** Renders only rows where value is non-null/non-empty, with correct first-row border logic */
function ProfileRows({ rows }: { rows: { label: string; value: string | null | undefined }[] }) {
  const visible = rows.filter(r => r.value != null && r.value !== '');
  return (
    <>
      {visible.map((r, i) => (
        <ProfileRow key={r.label} first={i === 0} label={r.label} value={r.value!} />
      ))}
    </>
  );
}

/** Returns true if at least one row has a non-null, non-empty value. */
function hasAny(rows: { label: string; value: string | null | undefined }[]): boolean {
  return rows.some(r => r.value != null && r.value !== '');
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.detailsGroup}>{children}</View>
    </View>
  );
}

// ─── format helpers ───────────────────────────────────────────────────────────
const GENDER_LABELS: Record<string, string> = {
  MALE: 'Man', FEMALE: 'Woman',
};

/** Map ISO-3166-1 alpha-2 code to full country name for common countries. */
const COUNTRY_NAMES: Record<string, string> = {
  AE: 'United Arab Emirates', AF: 'Afghanistan', AU: 'Australia',
  BD: 'Bangladesh',           BH: 'Bahrain',     CA: 'Canada',
  DE: 'Germany',              EG: 'Egypt',        FR: 'France',
  GB: 'United Kingdom',       ID: 'Indonesia',    IN: 'India',
  IQ: 'Iraq',                 IR: 'Iran',         JO: 'Jordan',
  KW: 'Kuwait',               LB: 'Lebanon',      LY: 'Libya',
  MA: 'Morocco',              MY: 'Malaysia',     NL: 'Netherlands',
  NZ: 'New Zealand',          OM: 'Oman',         PK: 'Pakistan',
  PS: 'Palestine',            QA: 'Qatar',        SA: 'Saudi Arabia',
  SE: 'Sweden',               SG: 'Singapore',    SO: 'Somalia',
  TN: 'Tunisia',              TR: 'Türkiye',      TZ: 'Tanzania',
  US: 'United States',        YE: 'Yemen',        ZA: 'South Africa',
};

function fmtCountry(code?: string | null): string | null {
  if (!code) return null;
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

const EDUCATION_LABELS: Record<string, string> = {
  PRIMARY: 'Primary school', SECONDARY: 'Secondary school',
  HIGHER_SECONDARY: 'A-levels / FSc', HIGH_SCHOOL: 'High school',
  DIPLOMA: 'Diploma', BACHELORS: "Bachelor's degree",
  MASTERS: "Master's degree", DOCTORATE: 'PhD', PHD: 'PhD', OTHER: 'Other',
};
const FIELD_OF_STUDY_LABELS: Record<string, string> = {
  ENGINEERING: 'Engineering', MEDICINE: 'Medicine', IT: 'IT / Computer Science',
  BUSINESS: 'Business', LAW: 'Law', ARTS: 'Arts & Humanities', OTHER: 'Other',
};
const EMPLOYMENT_LABELS: Record<string, string> = {
  EMPLOYED: 'Employed', SELF_EMPLOYED: 'Self-employed', STUDENT: 'Student',
  HOMEMAKER: 'Homemaker', UNEMPLOYED: 'Not employed',
};
const SECT_LABELS: Record<string, string> = {
  SUNNI: 'Sunni', SHIA: 'Shia', AHMADI: 'Ahmadi', ISMAILI: 'Ismaili',
  OTHER: 'Other', PREFER_NOT_SAY: 'Prefer not to say',
};
const MADHHAB_LABELS: Record<string, string> = {
  HANAFI: 'Hanafi', SHAFI: 'Shafi\'i', MALIKI: 'Maliki', HANBALI: 'Hanbali', JAFARI: 'Jafari',
};
const RELIGIOSITY_LABELS: Record<string, string> = {
  VERY_PRACTICING: 'Very practicing', PRACTICING: 'Practicing',
  MODERATELY_PRACTICING: 'Moderately practicing',
  MODERATE: 'Moderate', CULTURAL: 'Cultural',
};
const PRAYER_LABELS: Record<string, string> = {
  FIVE_DAILY: 'Five daily prayers', MOST_PRAYERS: 'Most prayers',
  SOMETIMES: 'Sometimes', RARELY: 'Rarely', NEVER: 'Never',
};
const MARITAL_LABELS: Record<string, string> = {
  NEVER_MARRIED: 'Single', DIVORCED: 'Divorced', WIDOWED: 'Widowed',
};

function fmt(map: Record<string, string>, key?: string | null): string | null {
  if (!key) return null;
  return map[key] ?? key;
}
function fmtBool(val?: boolean | null, yes = 'Yes', no = 'No'): string | null {
  if (val == null) return null;
  return val ? yes : no;
}
function fmtSect(sect?: string | null, madhhab?: string | null): string | null {
  const s = fmt(SECT_LABELS, sect);
  if (!s) return null;
  const m = madhhab && madhhab !== 'NONE' ? fmt(MADHHAB_LABELS, madhhab) : null;
  return m ? `${s} (${m})` : s;
}
function fmtHeight(cm?: number | null): string | null {
  if (!cm) return null;
  const feet = Math.floor(cm / 30.48);
  const inches = Math.round((cm % 30.48) / 2.54);
  return `${feet}ft ${inches}in (${cm} cm)`;
}

// ─── skeleton ────────────────────────────────────────────────────────────────
function SkeletonPulse({ style }: { style: object }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={[{ opacity, backgroundColor: '#E8E6F0', borderRadius: 8 }, style]} />;
}

function SkeletonCard({ rows = 4, title = true }: { rows?: number; title?: boolean }) {
  return (
    <View style={skStyles.card}>
      {title && <SkeletonPulse style={{ height: 13, width: '40%', marginBottom: 16 }} />}
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[skStyles.row, i > 0 && skStyles.rowBorder]}>
          <SkeletonPulse style={{ height: 12, width: '30%' }} />
          <SkeletonPulse style={{ height: 12, width: '40%' }} />
        </View>
      ))}
    </View>
  );
}

function ProfileDetailSkeleton({ onBack, insetTop }: { onBack?: () => void; insetTop: number }) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: Math.max(insetTop, 16) }]}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}><BackIcon /></Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}>
        {/* Photo skeleton */}
        <SkeletonPulse style={{ height: 268, borderRadius: 20 }} />
        {/* Photo card skeleton */}
        <View style={skStyles.card}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
            <SkeletonPulse style={{ width: 38, height: 38, borderRadius: 12 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonPulse style={{ height: 13, width: '55%' }} />
              <SkeletonPulse style={{ height: 11, width: '90%' }} />
              <SkeletonPulse style={{ height: 11, width: '75%' }} />
            </View>
          </View>
          <SkeletonPulse style={{ height: 48, borderRadius: 14 }} />
        </View>
        <SkeletonCard rows={5} />
        <SkeletonCard rows={4} />
        <SkeletonCard rows={3} />
        <SkeletonCard rows={4} />
      </ScrollView>
    </View>
  );
}

// ─── proposal context ─────────────────────────────────────────────────────────
/**
 * Controls which action buttons appear at the bottom of the profile.
 *   'none'              → fresh introduction: "Not suitable" + "Send proposal"
 *   'sent_pending'      → I sent a proposal, awaiting approval: "Withdraw" + "Proposal sent ✓"
 *   'sent_matched'      → she accepted: "Open chat"
 *   'received_pending'  → she proposed to me: "Decline" + "Accept proposal"
 *   'received_matched'  → we matched via her proposal: "Open chat"
 */
export type ProposalContext =
  | 'none'
  | 'sent_pending'
  | 'sent_matched'
  | 'received_pending'
  | 'received_matched';

// ─── props ────────────────────────────────────────────────────────────────────
interface ProfileDetailScreenProps {
  profile?: IntroductionProfile;
  loading?: boolean;
  isWaliView?: boolean;
  /** True when the wali is viewing their own ward's profile — hides photo request and action buttons */
  isDependent?: boolean;
  /** Controls which action buttons show based on proposal relationship */
  proposalContext?: ProposalContext;
  onBack?: () => void;
  onNotSuitable?: () => void;
  onRequestPhoto?: () => void;
  onSendProposal?: () => void;
  onWithdrawProposal?: () => void;
  onAcceptProposal?: () => void;
  onDeclineProposal?: () => void;
  onOpenChat?: () => void;
}

const DEFAULT_PROFILE: IntroductionProfile = {
  userId: '',
  displayName: 'Fatima S.',
  age: 27,
  city: 'Lahore',
  occupation: 'Healthcare',
  educationLevel: 'MASTERS',
  fieldOfStudy: 'MEDICINE',
  employmentStatus: 'EMPLOYED',
  languagesSpoken: ['Urdu', 'English'],
  bio: null,
  photoUrl: null,
  photoUrls: [],
  blurPhotos: false,
  hideDistance: false,
  distanceKm: null,
  gender: 'FEMALE',
  heightCm: 163,
  maritalStatus: 'NEVER_MARRIED',
  hasChildren: false,
  willingToRelocate: false,
  sect: 'SUNNI',
  madhhab: 'HANAFI',
  religiosity: 'PRACTICING',
  prayerFrequency: 'FIVE_DAILY',
  wearsHijab: true,
  keepsBeard: null,
  halalStrict: true,
  quranMemorization: null,
  familyType: 'JOINT',
  housingStatus: 'Family home',
  livingArrangement: 'Joint family',
  fatherOccupation: 'Doctor',
  motherOccupation: 'Teacher',
  siblingsSummary: '2 brothers, 1 sister',
  hasVehicle: true,
  idVerified: true,
  waliRegistered: true,
  countryCode: 'PK',
};

// ─── component ────────────────────────────────────────────────────────────────
export function ProfileDetailScreen({
  profile,
  loading = false,
  isWaliView = false,
  isDependent = false,
  proposalContext = 'none',
  onBack,
  onNotSuitable,
  onRequestPhoto,
  onSendProposal,
  onWithdrawProposal,
  onAcceptProposal,
  onDeclineProposal,
  onOpenChat,
}: ProfileDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [photoRequested, setPhotoRequested] = useState(false);

  if (loading) {
    return <ProfileDetailSkeleton onBack={onBack} insetTop={insets.top} />;
  }

  const resolvedProfile = profile ?? DEFAULT_PROFILE;

  function handleRequestPhoto() {
    setPhotoRequested(true);
    onRequestPhoto?.();
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backBtn,
            { opacity: pressed ? 0.65 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
          ]}>
          <BackIcon />
        </Pressable>

        <Text style={styles.headerTitle}>Profile</Text>

        {/* spacer to keep title centred */}
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ── Photo area ──────────────────────────────────────────────── */}
        {isWaliView ? (
          resolvedProfile.blurPhotos || !resolvedProfile.photoUrls?.length ? (
            <View style={styles.photoWrap}>
              <View style={styles.photoInner}>
                <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                  <Rect x={4} y={11} width={16} height={10} rx={2.5} stroke={Colors.vio} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={Colors.vio} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={styles.photoHintText}>Photos are locked</Text>
              </View>
            </View>
          ) : (
            <PhotoCarousel urls={resolvedProfile.photoUrls} />
          )
        ) : (
          <View style={styles.photoWrap}>
            <View style={styles.photoInner}>
              <PersonIcon />
            </View>

            {/* gradient fades bottom of photo → identity overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(15,10,42,0.82)']}
              style={styles.photoGradient}>
              {resolvedProfile.displayName ? (
                <Text style={styles.overlayName}>{resolvedProfile.displayName}</Text>
              ) : null}
              <Text style={styles.overlayAge}>{resolvedProfile.age} · {resolvedProfile.city}</Text>
              {fmtSect(resolvedProfile.sect, resolvedProfile.madhhab) || fmt(RELIGIOSITY_LABELS, resolvedProfile.religiosity) ? (
                <Text style={styles.overlaySect}>
                  {[fmtSect(resolvedProfile.sect, resolvedProfile.madhhab), fmt(RELIGIOSITY_LABELS, resolvedProfile.religiosity)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
              {(resolvedProfile.idVerified || resolvedProfile.waliRegistered) ? (
                <View style={styles.overlayBadges}>
                  {resolvedProfile.idVerified ? (
                    <View style={styles.overlayBadge}>
                      <ShieldCheckIcon />
                      <Text style={styles.overlayBadgeText}>ID verified</Text>
                    </View>
                  ) : null}
                  {resolvedProfile.waliRegistered ? (
                    <View style={[styles.overlayBadge, styles.overlayBadgeVio]}>
                      <UsersIcon />
                      <Text style={[styles.overlayBadgeText, styles.overlayBadgeTextVio]}>Wali registered</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </LinearGradient>
          </View>
        )}

        {/* ── Photo request card ───────────────────────────────────────── */}
        {!isDependent && <View style={styles.card}>
          {resolvedProfile.photoRequestsPaused ? (
            /* Paused state — shown to other users when the viewed user has paused requests */
            <View style={styles.sentRow}>
              <View style={[styles.sentDot, { backgroundColor: '#B5820D' }]} />
              <Text style={styles.sentText}>
                This person has paused photo requests for now.
              </Text>
            </View>
          ) : photoRequested ? (
            /* Sent state */
            <View style={styles.sentRow}>
              <View style={styles.sentDot} />
              <Text style={styles.sentText}>
                {isWaliView
                  ? 'Photo request sent on your ward\'s behalf.'
                  : 'Photo request sent — she\'ll be notified when she logs in.'}
              </Text>
            </View>
          ) : (
            /* Request state */
            <>
              <Text style={styles.photoReqHint}>
                Photos are kept private until both sides have approved the proposal. Once approved, you can request a photo directly.
              </Text>
              <Pressable
                onPress={handleRequestPhoto}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}>
                <LinearGradient
                  colors={['#9B7BF0', '#7C5AE0']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.photoReqBtn}>
                  <CameraIcon />
                  <Text style={styles.photoReqBtnText}>
                    Request photo
                  </Text>
                </LinearGradient>
              </Pressable>
            </>
          )}
        </View>}

        {/* ── Basic info card ──────────────────────────────────────────── */}
        <DetailCard title="Basic info">
          <ProfileRows rows={[
            { label: 'Gender', value: fmt(GENDER_LABELS, resolvedProfile.gender) },
            { label: 'Age', value: String(resolvedProfile.age) },
            { label: 'Country', value: fmtCountry(resolvedProfile.countryCode) },
            { label: 'City', value: resolvedProfile.city },
            // Height always shown — families always want to see this
            { label: 'Height', value: fmtHeight(resolvedProfile.heightCm) ?? 'Not specified' },
            { label: 'Marital status', value: fmt(MARITAL_LABELS, resolvedProfile.maritalStatus) },
            { label: 'Has children', value: fmtBool(resolvedProfile.hasChildren) },
            { label: 'Open to relocate', value: fmtBool(resolvedProfile.willingToRelocate, 'Yes', 'No') },
          ]} />
        </DetailCard>

        {/* ── Religious card ───────────────────────────────────────────── */}
        {(() => {
          const rows = [
            { label: 'Sect', value: fmtSect(resolvedProfile.sect, resolvedProfile.madhhab) },
            { label: 'Religiosity', value: fmt(RELIGIOSITY_LABELS, resolvedProfile.religiosity) },
            { label: 'Prayer', value: fmt(PRAYER_LABELS, resolvedProfile.prayerFrequency) },
            { label: 'Wears hijab', value: fmtBool(resolvedProfile.wearsHijab) },
            { label: 'Keeps beard', value: fmtBool(resolvedProfile.keepsBeard) },
            { label: 'Strictly halal', value: fmtBool(resolvedProfile.halalStrict) },
            { label: 'Quran', value: resolvedProfile.quranMemorization ?? null },
          ];
          return hasAny(rows) ? (
            <DetailCard title="Religious practice">
              <ProfileRows rows={rows} />
            </DetailCard>
          ) : null;
        })()}

        {/* ── Education & work card — always shown; Education + Profession ─────
             always have a value so families can see the field exists even when
             the person didn't fill it in (mirrors home card "—" behaviour).    */}
        <DetailCard title="Education & work">
          <ProfileRows rows={[
            // Always shown
            { label: 'Education', value: fmt(EDUCATION_LABELS, resolvedProfile.educationLevel) ?? 'Not specified' },
            { label: 'Profession', value: resolvedProfile.occupation ?? 'Not specified' },
            // Only shown when filled
            { label: 'Field of study', value: fmt(FIELD_OF_STUDY_LABELS, resolvedProfile.fieldOfStudy) },
            { label: 'Employment', value: fmt(EMPLOYMENT_LABELS, resolvedProfile.employmentStatus) },
            { label: 'Languages', value: resolvedProfile.languagesSpoken?.length ? resolvedProfile.languagesSpoken.join(', ') : null },
          ]} />
        </DetailCard>

        {/* ── Family card ──────────────────────────────────────────────── */}
        {(() => {
          const rows = [
            { label: 'Family type', value: resolvedProfile.familyType ?? null },
            { label: 'Housing', value: resolvedProfile.housingStatus ?? null },
            { label: 'After marriage', value: resolvedProfile.livingArrangement ?? null },
            { label: 'Siblings', value: resolvedProfile.siblingsSummary ?? null },
            { label: "Father's work", value: resolvedProfile.fatherOccupation ?? null },
            { label: "Mother's work", value: resolvedProfile.motherOccupation ?? null },
            { label: 'Owns a car', value: fmtBool(resolvedProfile.hasVehicle) },
          ];
          return hasAny(rows) ? (
            <DetailCard title="Family background">
              <ProfileRows rows={rows} />
            </DetailCard>
          ) : null;
        })()}

        {/* ── Bio ─────────────────────────────────────────────────────── */}
        {resolvedProfile.bio ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>In their words</Text>
            <Text style={styles.bioText}>{resolvedProfile.bio}</Text>
          </View>
        ) : null}

        {/* ── Actions ─────────────────────────────────────────────────── */}
        {!isDependent && (
          <View style={styles.actions}>
            {(proposalContext === 'sent_matched' || proposalContext === 'received_matched') && (
              /* Matched — only show Open chat */
              <Pressable
                onPress={onOpenChat}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  width: '100%',
                })}>
                <LinearGradient
                  colors={['#3ECFB0', '#22B89A']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Open chat</Text>
                </LinearGradient>
              </Pressable>
            )}

            {proposalContext === 'sent_pending' && (
              /* Sent, waiting — Withdraw + disabled "Proposal sent" */
              <>
                <Pressable
                  onPress={onWithdrawProposal}
                  style={({ pressed }) => [
                    styles.btnOutline,
                    { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}>
                  <Text style={styles.btnOutlineText}>Withdraw proposal</Text>
                </Pressable>
                <View style={[styles.btnPrimary, { backgroundColor: '#B5BAC8', opacity: 0.7 }]}>
                  <Text style={styles.btnPrimaryText}>Proposal sent ✓</Text>
                </View>
              </>
            )}

            {proposalContext === 'received_pending' && (
              /* Received, pending — Decline + Accept */
              <>
                <Pressable
                  onPress={onDeclineProposal}
                  style={({ pressed }) => [
                    styles.btnOutline,
                    { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}>
                  <Text style={styles.btnOutlineText}>Decline</Text>
                </Pressable>
                <Pressable
                  onPress={onAcceptProposal}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}>
                  <LinearGradient
                    colors={['#F2559A', '#E6396E']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.btnPrimary}>
                    <Text style={styles.btnPrimaryText}>Accept proposal</Text>
                  </LinearGradient>
                </Pressable>
              </>
            )}

            {proposalContext === 'none' && (
              /* Default — Not suitable + Send proposal */
              <>
                <Pressable
                  onPress={onNotSuitable}
                  style={({ pressed }) => [
                    styles.btnOutline,
                    { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}>
                  <Text style={styles.btnOutlineText}>
                    {isWaliView ? 'Not suitable for ward' : 'Not suitable'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onSendProposal}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}>
                  <LinearGradient
                    colors={['#F2559A', '#E6396E']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.btnPrimary}>
                    <Text style={styles.btnPrimaryText}>
                      {isWaliView ? 'Send proposal for ward' : 'Send proposal'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.page,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.page,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: -0.2,
  },

  headerSpacer: {
    width: 38,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },

  // ── Photo ───────────────────────────────────────────────────────────────────
  photoWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 268,
    backgroundColor: '#EDEBF8',
  },

  photoInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  photoHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8580B4',
    letterSpacing: 0.1,
  },

  photoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 52,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },

  overlayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 2,
  },

  overlayAge: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: -0.2,
    marginBottom: 3,
  },

  overlaySect: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 11,
  },

  overlayBadges: {
    flexDirection: 'row',
    gap: 7,
    flexWrap: 'wrap',
  },

  overlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.mintSoft,
  },

  overlayBadgeVio: {
    backgroundColor: Colors.vioSoft,
  },

  overlayBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.mintInk,
  },

  overlayBadgeTextVio: {
    color: Colors.vioInk,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: -0.1,
    marginBottom: 4,
  },

  bioText: {
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 20,
    marginTop: 12,
  },

  // ── Lock / photo request ────────────────────────────────────────────────────
  lockRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  lockIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.vioSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  lockTexts: {
    flex: 1,
  },

  lockTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 4,
  },

  lockBody: {
    fontSize: 12.5,
    color: Colors.ink2,
    lineHeight: 18,
  },

  photoReqBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  photoReqBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Sent confirmation ────────────────────────────────────────────────────────
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  sentDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.mint,
    shadowColor: Colors.mint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 5,
    elevation: 2,
    flexShrink: 0,
  },

  photoReqHint: {
    fontSize: 12.5,
    color: Colors.ink2,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 12,
  },

  sentText: {
    flex: 1,
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 19,
  },

  // ── Profile rows ─────────────────────────────────────────────────────────────
  detailsGroup: {
    marginTop: 2,
  },

  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 10,
  },

  profileRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },

  profileRowLabel: {
    fontSize: 13,
    color: Colors.ink2,
    flex: 1,
  },

  profileRowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
    textAlign: 'right',
    flex: 1,
  },

  // ── Badges (inside photo section only) ────────────────────────────────────
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // ── Action buttons ────────────────────────────────────────────────────────
  actions: {
    gap: 10,
  },

  btnOutline: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(155,123,240,0.3)',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },

  btnOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.vioInk,
  },

  btnPrimary: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

// ─── carousel styles ──────────────────────────────────────────────────────────
const carouselStyles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(60,40,122,0.18)',
  },
  dotActive: {
    backgroundColor: '#7C5AE0',
    width: 18,
    borderRadius: 3,
  },
});

// ─── skeleton styles ──────────────────────────────────────────────────────────
const skStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEEDF3',
  },
});
