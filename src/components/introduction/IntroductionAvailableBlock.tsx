/**
 * IntroductionAvailableBlock — H16: Introduction available
 *
 * Shown on HomeScreen when the user is a paid member and introductions
 * are ready for today.
 *
 * Two sub-states:
 *   hasIntroductions = true  → Hero + introduction card (H16)
 *   hasIntroductions = false → Hero + "no profiles in your city" empty state
 *
 *   ┌──────────────────────────────────┐
 *   │  Hero (dark indigo, green dot)   │
 *   │  SEARCH ACTIVE                   │
 *   │  We're looking for someone      │
 *   │  Introductions are made…         │
 *   │  ─────────────────────────────   │
 *   │  6  Fit your criteria            │
 *   │  148  Reviewed this week         │
 *   └──────────────────────────────────┘
 *
 *   When hasIntroductions = true:
 *   ┌──────────────────────────────────┐
 *   │  Today's introduction   1 of 3  │
 *   └──────────────────────────────────┘
 *   ┌──────────────────────────────────┐
 *   │  27 · Lahore                     │
 *   │  Sunni (Hanafi) · Practicing     │
 *   │  [ID verified] [Wali registered] │
 *   │  ┌── photo placeholder ───────┐  │
 *   │  │  (person icon, locked)     │  │
 *   │  └────────────────────────────┘  │
 *   │  Education   Master's degree     │
 *   │  Profession  Healthcare          │
 *   │  Height      5ft 4in             │
 *   │  Marital     Single              │
 *   │  Family      Joint family        │
 *   │  🔒 Ask to see her photo…        │
 *   │  [Not suitable]  [Request photo] │
 *   └──────────────────────────────────┘
 *
 *   When hasIntroductions = false:
 *   ┌──────────────────────────────────┐
 *   │  📍 No profiles in [city] yet    │
 *   │  Try a different city or adjust  │
 *   │  your criteria from the filters. │
 *   │  [Change city]                   │
 *   │  [Adjust filters]                │
 *   └──────────────────────────────────┘
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors } from '../../theme/colors';
import { Coords, distanceKm, formatDistanceKm } from '../../utils/location';
import { DailyDuaCard } from '../ui/DailyDuaCard';
import { WhileYouWaitCard } from '../ui/WhileYouWaitCard';
import { formatHeight } from '../../utils/height';
import { Bone, DarkBone } from '../ui/Skeleton';
import {
  EDUCATION_LABELS,
  MADHHAB_LABELS,
  MARITAL_LABELS,
  RELIGIOSITY_LABELS,
  SECT_LABELS,
  labelFor,
} from '../../utils/enumLabels';
import { GRADIENT_FILL } from '../../theme/layout';

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatEducation(level: string | null | undefined): string | null {
  return labelFor(EDUCATION_LABELS, level);
}

function formatSect(sect?: string | null, madhhab?: string | null): string | null {
  const s = labelFor(SECT_LABELS, sect);
  if (!s) return null;
  // NONE is a real Madhhab member meaning "not followed", so it is omitted
  // rather than printed beside the sect.
  const m = madhhab && madhhab !== 'NONE' ? labelFor(MADHHAB_LABELS, madhhab) : null;
  return m ? `${s} (${m})` : s;
}

function formatReligiosity(r?: string | null): string | null {
  return labelFor(RELIGIOSITY_LABELS, r);
}

function formatMarital(m?: string | null): string | null {
  return labelFor(MARITAL_LABELS, m);
}

// ─── gradients ────────────────────────────────────────────────────────────────
const HERO_GRADIENT = ['#5F55A8', '#3E3776', '#2B2653'] as const;

// ─── icons ────────────────────────────────────────────────────────────────────
function LockIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Rect
        x={4} y={11} width={16} height={10} rx={2.5}
        stroke="#9695A5"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 11V7a4 4 0 0 1 8 0v4"
        stroke="#9695A5"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PersonIcon() {
  return (
    <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke="#9A93C4" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 21v-1a7 7 0 0 1 16 0v1" stroke="#9A93C4" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MapPinIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        stroke={Colors.vio}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={9} r={2.5} stroke={Colors.vio} strokeWidth={1.8} />
    </Svg>
  );
}

function SlidersIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" stroke={Colors.vioInk} strokeWidth={2} strokeLinecap="round" />
      <Path d="M1 14h6M9 8h6M17 16h6" stroke={Colors.vioInk} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function FilterIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M3 12h18M3 18h18" stroke={Colors.vioInk} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={14} cy={6}  r={3} fill={Colors.page} stroke={Colors.vioInk} strokeWidth={2} />
      <Circle cx={8}  cy={12} r={3} fill={Colors.page} stroke={Colors.vioInk} strokeWidth={2} />
      <Circle cx={14} cy={18} r={3} fill={Colors.page} stroke={Colors.vioInk} strokeWidth={2} />
    </Svg>
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

// ─── badge ────────────────────────────────────────────────────────────────────
function Badge({ label, variant }: { label: string; variant: 'mint' | 'indigo' }) {
  const bg   = variant === 'mint'   ? Colors.mintSoft  : Colors.vioSoft;
  const text = variant === 'mint'   ? Colors.mintInk   : Colors.vioInk;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
export interface IntroductionProfile {
  userId: string;
  displayName?: string | null;
  age: number;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  occupation?: string | null;
  educationLevel?: string | null;
  fieldOfStudy?: string | null;
  employmentStatus?: string | null;
  languagesSpoken?: string[];
  bio?: string | null;
  photoUrl?: string | null;
  photoUrls?: string[];
  photosWithheld?: boolean;
  /**
   * The viewer's standing photo request, resolved by the server.
   *
   * Held here rather than in the detail screen's own state: component state is
   * lost on remount, so a request that had already been sent came back as
   * "never asked" and the button offered it again.
   */
  photoRequestStatus?: 'PENDING' | 'APPROVED' | 'DECLINED' | 'REVOKED' | null;
  photoRequestWaitingOn?: 'owner' | 'wali' | null;
  hideDistance?: boolean;
  compatibility?: number;
  distanceKm?: number | null;
  // Religious profile
  sect?: string | null;
  madhhab?: string | null;
  religiosity?: string | null;
  prayerFrequency?: string | null;
  wearsHijab?: boolean | null;
  keepsBeard?: boolean | null;
  halalStrict?: boolean | null;
  quranMemorization?: string | null;
  // Demographics
  gender?: string | null;
  heightCm?: number | null;
  maritalStatus?: string | null;
  hasChildren?: boolean | null;
  willingToRelocate?: boolean | null;
  // Family background
  familyType?: string | null;
  housingStatus?: string | null;
  livingArrangement?: string | null;
  fatherOccupation?: string | null;
  motherOccupation?: string | null;
  siblingsSummary?: string | null;
  hasVehicle?: boolean | null;
  // Verification
  idVerified?: boolean;
  waliRegistered?: boolean;
  photoRequestsPaused?: boolean;
  // Location detail
  countryCode?: string | null;
}

interface IntroductionAvailableBlockProps {
  /** true → show introduction card; false → show "no profiles in city" state */
  hasIntroductions?: boolean;
  /** User's current search city — shown in empty state */
  city?: string;
  /** User's GPS coordinates — used to compute and display distance to each profile. */
  userCoords?: Coords;
  /** Number of profiles matching criteria (hero stat) */
  matchCriteria?: number;
  /** Number of profiles reviewed this week (hero stat) */
  reviewedThisWeek?: number;
  /** Which introduction this is today (e.g. 1) */
  introductionIndex?: number;
  /** Total introductions available today (e.g. 3) */
  totalIntroductions?: number;
  /** Profile data to show on the introduction card */
  profile?: IntroductionProfile;
  /** "Not suitable" tapped */
  onNotSuitable?: () => void;
  /** "View profile" tapped */
  onViewProfile?: () => void;
  /** "Send proposal" tapped — receives the optional note the user typed. Return a Promise to show a loader until it resolves. */
  onSendProposal?: (note: string) => Promise<void> | void;
  /** "Change city" tapped (empty state) */
  onChangeCity?: () => void;
  /** "Adjust filters" tapped (empty state) */
  onAdjustFilters?: () => void;
  userName?: string;
  /** Pull-to-refresh handler */
  onRefresh?: () => Promise<void>;
  /** Show skeleton loader while introductions API is loading */
  isLoading?: boolean;
  /** Filter icon tapped — opens filter/criteria screen */
  onOpenFilters?: () => void;
}


// ─── skeleton ─────────────────────────────────────────────────────────────────

function IntroductionSkeleton({ insets, userName }: {
  // `bottom` too: the skeleton has to clear the floating nav by the same
  // margin as the content it stands in for, or the list jumps on load.
  insets: { top: number; bottom: number };
  userName: string;
}) {
  return (
    <ScrollView
      contentContainerStyle={[
        skStyles.scroll,
        {
          paddingTop: Math.max(insets.top + 16, 32),
          // Matches the real content's padding. A flat 110 ignored the home
          // indicator, so the skeleton's last row sat closer to the floating
          // nav than the content that replaced it — a visible jump on load.
          paddingBottom: Math.max(insets.bottom + 100, 110),
        },
      ]}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}>

      {/* Greeting */}
      {userName ? (
        <View style={skStyles.hdr}>
          <Bone w={120} h={13} radius={6} />
          <Bone w={160} h={26} radius={8} style={{ marginTop: 6 }} />
        </View>
      ) : null}

      {/* Hero card */}
      <View style={skStyles.hero}>
        <LinearGradient
        colors={[...HERO_GRADIENT]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={GRADIENT_FILL}
        pointerEvents="none"
      />
        <View style={skStyles.heroTopRow}>
          <DarkBone w={10} h={10} radius={5} />
          <DarkBone w={100} h={11} radius={5} />
        </View>
        <DarkBone w={'70%'} h={28} radius={8} style={{ marginTop: 14 }} />
        <DarkBone w={'55%'} h={28} radius={8} style={{ marginTop: 8 }} />
        <DarkBone w={'80%'} h={14} radius={6} style={{ marginTop: 14 }} />
        <View style={skStyles.statsRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <DarkBone w={36} h={20} radius={6} />
            <DarkBone w={90} h={11} radius={5} />
          </View>
          <View style={[{ flex: 1, gap: 6 }, skStyles.statBorder]}>
            <DarkBone w={36} h={20} radius={6} />
            <DarkBone w={110} h={11} radius={5} />
          </View>
        </View>
      </View>

      {/* Section header */}
      <View style={skStyles.sectionRow}>
        <Bone w={140} h={13} radius={6} />
        <Bone w={50} h={13} radius={6} />
      </View>

      {/* Introduction card */}
      <View style={skStyles.card}>
        {/* Card header */}
        <View style={skStyles.cardHeader}>
          <View style={{ flex: 1, gap: 8 }}>
            <Bone w={'55%'} h={24} radius={8} />
            <Bone w={'40%'} h={13} radius={6} />
            <Bone w={'35%'} h={13} radius={6} />
          </View>
          <View style={{ gap: 6, alignItems: 'flex-end' }}>
            <Bone w={80} h={22} radius={7} />
            <Bone w={94} h={22} radius={7} />
          </View>
        </View>

        {/* Profile rows */}
        <View style={skStyles.rows}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[skStyles.row, i > 1 && skStyles.rowBorder]}>
              <Bone w={70} h={13} radius={6} />
              <Bone w={90} h={13} radius={6} />
            </View>
          ))}
        </View>

        {/* Lock note */}
        <View style={skStyles.lockBox}>
          <Bone w={'100%'} h={13} radius={6} />
          <Bone w={'80%'} h={13} radius={6} style={{ marginTop: 6 }} />
        </View>

        {/* Buttons */}
        <View style={skStyles.btns}>
          <Bone w={'100%'} h={46} radius={14} />
          <View style={skStyles.btnRow}>
            <Bone w={'48%'} h={46} radius={14} />
            <Bone w={'48%'} h={46} radius={14} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
export function IntroductionAvailableBlock({
  hasIntroductions = true,
  city = 'your city',
  userCoords,
  // 0, not a sample figure: an unpassed count must not read as a real one.
  matchCriteria = 0,
  reviewedThisWeek = 148,
  introductionIndex,
  totalIntroductions,
  profile,
  onNotSuitable,
  onViewProfile,
  onSendProposal,
  onChangeCity,
  onAdjustFilters,
  userName = '',
  onRefresh,
  isLoading = false,
  onOpenFilters,
}: IntroductionAvailableBlockProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }

  // ── Card transition animation ──────────────────────────────────────────────
  // Start off-screen right so first entrance animates in cleanly.
  const slideAnim = useRef(new Animated.Value(340)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const transitioning = useRef(false);
  const [activeButton, setActiveButton] = useState<'notSuitable' | 'sendProposal' | null>(null);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);
  const NOTE_LIMIT = 300;
  const sheetSlideAnim = useRef(new Animated.Value(500)).current;
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    if (!noteModalVisible) { setKbHeight(0); return; }
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbHeight(0),
    );
    return () => { show.remove(); hide.remove(); };
  }, [noteModalVisible]);

  function openNoteModal() {
    sheetSlideAnim.setValue(500);
    setNoteModalVisible(true);
    Animated.timing(sheetSlideAnim, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function closeNoteModal() {
    Animated.timing(sheetSlideAnim, {
      toValue: 500,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setNoteModalVisible(false));
  }

  // Slide in from the right when a new profile arrives.
  useEffect(() => {
    if (!profile?.userId) return;
    setActiveButton(null);
    setNoteText('');
    slideAnim.setValue(340);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => { transitioning.current = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.userId]);

  // Slide the current card out left, then fire the action callback.
  const animateOut = useCallback((onComplete: () => void) => {
    if (transitioning.current) return;
    transitioning.current = true;
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -340,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Park off-screen right so the next slide-in starts from the right.
      slideAnim.setValue(340);
      onComplete();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use backend-provided distanceKm first; fall back to client-side haversine
  // if the backend didn't compute it but we have both sets of coordinates.
  const distanceLabel: string | null =
    !profile || profile.hideDistance
      ? null
      : profile.distanceKm != null
        ? formatDistanceKm(profile.distanceKm)
        : userCoords && profile.latitude != null && profile.longitude != null
          ? formatDistanceKm(
              distanceKm(userCoords, {
                latitude: profile.latitude,
                longitude: profile.longitude,
              }),
            )
          : null;

  /**
   * There is an actual introduction to show.
   *
   * `hasIntroductions` alone was not enough: it is the server's answer about the
   * pool, and it stays true for the moment between a filter change emptying the
   * feed and the next response landing. Requiring the profile too means the
   * empty state shows rather than a card with nothing behind it.
   */
  const hasCard = hasIntroductions && !!profile?.userId;

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <IntroductionSkeleton insets={insets} userName={userName} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Sticky greeting header — outside ScrollView so it never scrolls ── */}
      {userName ? (
        <View style={[styles.stickyHdr, { paddingTop: insets.top + 11 }]}>
          {/* Scaled rather than truncated: a greeting cut to "Assalamu
              alaik…" reads as broken, and at ~280dp (a folded Galaxy Fold)
              the reserved chrome leaves it just short of fitting. */}
          <Text
            style={styles.hdrSalam}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}>
            Assalamu alaikum
          </Text>
          {/* The name truncates instead of scaling — a shrinking name would
              change size between users, which reads as a bug. */}
          <Text style={styles.hdrName} numberOfLines={1}>{userName}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: userName ? 12 : Math.max(insets.top + 16, 32),
            paddingBottom: Math.max(insets.bottom + 100, 110),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.vioInk}
            colors={[Colors.vioInk]}
          />
        }>

        {/* ── Hero card ───────────────────────────────────────────────
            A plain View owns the layout and the gradient fills behind it.

            The gradient used to be the container itself, and on iOS it did not
            grow to its children: the card rendered short and its borderRadius
            mask cut straight through the stats row, so the numbers were sliced
            in half and their labels were gone entirely. Android sized it
            correctly, which is why it only showed up on iOS.

            A View's height is Yoga's to decide on both platforms, so the two
            now agree. */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={[...HERO_GRADIENT]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.6, y: 1 }}
            style={styles.heroFill}
            pointerEvents="none"
          />

          {/* Green pulse dot + label */}
          <View style={styles.heroTop}>
            <View style={styles.greenpulse} />
            <Text style={styles.heroLabel}>Search Active</Text>
          </View>

          <Text style={styles.heroHeading}>
            {"We're looking for\nsomeone suitable"}
          </Text>

          <Text style={styles.heroPara}>
            Introductions are made carefully, a few at a time.
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statNumber}>{matchCriteria}</Text>
              <Text style={styles.statLabel}>Fit your criteria</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statNumber}>{reviewedThisWeek}</Text>
              <Text style={styles.statLabel}>Reviewed this week</Text>
            </View>
          </View>
        </View>

        {hasCard && profile ? (
          <>
            {/* ── Section header ─────────────────────────────────────── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{"Today\u2019s introduction"}</Text>
              <View style={styles.sectionRight}>
                {userCoords && (
                  <View style={styles.nearestBadge}>
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                        fill={Colors.vioInk}
                      />
                    </Svg>
                    <Text style={styles.nearestText}>Nearest first</Text>
                  </View>
                )}
                {/* Only when the pair actually describes a position in a
                    list. A total below the current index cannot be true of the
                    card being shown, and printing it anyway is how "1 of 0"
                    appeared above a real profile. */}
                {introductionIndex != null &&
                  totalIntroductions != null &&
                  totalIntroductions >= introductionIndex && (
                    <Text style={styles.sectionCount}>
                      {introductionIndex} of {totalIntroductions}
                    </Text>
                  )}
              </View>
            </View>

            {/* ── Introduction card ──────────────────────────────────── */}
            <Animated.View style={[styles.introCard, { transform: [{ translateX: slideAnim }], opacity: fadeAnim }]}>

              {/* Card header: age · city + badges */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.whoText}>
                    {profile.age} · {profile.city}
                  </Text>
                  {profile.displayName ? (
                    <Text style={styles.whoName}>{profile.displayName}</Text>
                  ) : null}
                  {(() => {
                    const sectLabel = formatSect(profile.sect, profile.madhhab);
                    const relLabel  = formatReligiosity(profile.religiosity);
                    const sub = [sectLabel, relLabel].filter(Boolean).join(' · ');
                    return sub ? <Text style={styles.whoSub}>{sub}</Text> : null;
                  })()}
                  {distanceLabel && (
                    <View style={styles.distanceRow}>
                      <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                          fill={Colors.vioD}
                        />
                      </Svg>
                      <Text style={styles.distanceText}>{distanceLabel}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.badgeGroup}>
                  {profile.idVerified && <Badge label="ID verified" variant="mint" />}
                  {profile.waliRegistered && <Badge label="Wali registered" variant="indigo" />}
                </View>
              </View>

              {/* Profile rows */}
              <View style={styles.profileRows}>
                {(() => {
                  const sectLabel = formatSect(profile.sect, profile.madhhab);
                  const relLabel  = formatReligiosity(profile.religiosity);
                  const mar       = formatMarital(profile.maritalStatus);
                  const rows: { label: string; value: string }[] = [];
                  if (sectLabel) rows.push({ label: 'Sect', value: sectLabel });
                  if (relLabel)  rows.push({ label: 'Religiosity', value: relLabel });
                  // Always show these three — fall back to '—' if data is missing
                  rows.push({ label: 'Education', value: formatEducation(profile.educationLevel) ?? '—' });
                  rows.push({ label: 'Profession', value: profile.occupation ?? '—' });
                  rows.push({ label: 'Height', value: formatHeight(profile.heightCm) ?? '—' });
                  if (mar) rows.push({ label: 'Marital status', value: mar });
                  if (profile.familyType) rows.push({ label: 'Family', value: profile.familyType });
                  return rows.map((r, i) => (
                    <ProfileRow key={r.label} first={i === 0} label={r.label} value={r.value} />
                  ));
                })()}
              </View>

              {/* Lock note */}
              <View style={styles.lockRow}>
                <LockIcon />
                <Text style={styles.lockText}>
                  Tap <Text style={styles.lockBold}>View full profile</Text> to see her complete
                  biodata. Once she accepts your proposal, you can send a request to see her photos.
                </Text>
              </View>

              {/* Action buttons */}
              <View style={styles.actionsCol}>

                {/* View full profile — full-width */}
                <Pressable
                  onPress={onViewProfile}
                  style={({ pressed }) => [
                    styles.btnViewProfile,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}>
                  <Text style={styles.btnViewProfileText}>View full profile</Text>
                </Pressable>

                {/* Not suitable + Send proposal */}
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => {
                      setActiveButton('notSuitable');
                      animateOut(() => onNotSuitable?.());
                    }}
                    disabled={activeButton !== null}
                    style={({ pressed }) => [
                      styles.btnOutline,
                      { opacity: activeButton !== null ? 0.6 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}>
                    {activeButton === 'notSuitable'
                      ? <ActivityIndicator size="small" color={Colors.vioInk} />
                      : <Text style={styles.btnOutlineText}>Not suitable</Text>}
                  </Pressable>

                  <Pressable
                    onPress={() => { setNoteText(''); openNoteModal(); }}
                    disabled={activeButton !== null}
                    style={({ pressed }) => [
                      styles.btnPrimary,
                      { opacity: activeButton !== null ? 0.6 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}>
                    <LinearGradient
                      colors={['#F2559A', '#E6396E']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.btnPrimaryInner}>
                      {activeButton === 'sendProposal'
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.btnPrimaryText}>Send proposal</Text>}
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </>
        ) : (
          /* ── Empty state: no profiles in user's city ──────────────── */
          <><View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <MapPinIcon />
            </View>

            <Text style={styles.emptyHeading}>
              No profiles in {city} yet
            </Text>

            <Text style={styles.emptyBody}>
              There are no profiles available from your city right now.
              Try using a different city or adjust your criteria from
              the filters to find more profiles.
            </Text>

            <View style={styles.emptyActions}>
              <Pressable
                onPress={onChangeCity}
                style={({ pressed }) => [
                  styles.emptyBtnOutline,
                  { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}>
                <Text style={styles.emptyBtnOutlineText}>Try a different city</Text>
              </Pressable>

              <Pressable
                onPress={onAdjustFilters}
                style={({ pressed }) => [
                  styles.emptyBtnGhost,
                  { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}>
                <SlidersIcon />
                <Text style={styles.emptyBtnGhostText}>Adjust filters</Text>
              </Pressable>
            </View>
          </View>

          {/* While you wait — shown below empty state */}
          <WhileYouWaitCard doneCount={2} />

          {/* Daily Dua — shown below empty state */}
          <DailyDuaCard /></>
        )}
      </ScrollView>

      {/* ── Filter button — fixed overlay, outside ScrollView ────────── */}
      {onOpenFilters && (
        <Pressable
          onPress={onOpenFilters}
          hitSlop={8}
          style={[styles.filterBtn, { top: insets.top + 8 }]}>
          <FilterIcon />
        </Pressable>
      )}

      {/* ── Send proposal — note modal ────────────────────────────────── */}
      <Modal
        visible={noteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeNoteModal}>
        {/* Outer column: backdrop fills space above sheet, sheet sits at bottom */}
        <View style={[noteStyles.overlay, kbHeight > 0 && { paddingBottom: kbHeight }]}>
          {/* Backdrop — only occupies the area above the sheet */}
          <Pressable style={{ flex: 1 }} onPress={closeNoteModal} />

          {/* Sheet slides up independently; keyboard is handled via paddingBottom above */}
          <Animated.View style={{ transform: [{ translateY: sheetSlideAnim }] }}>
              <View style={noteStyles.sheet}>
                <View style={noteStyles.handle} />

                <Text style={noteStyles.title}>Send proposal</Text>
                <Text style={noteStyles.subtitle}>
                  Add a personal note to introduce yourself — optional but recommended.
                </Text>

                <TextInput
                  style={noteStyles.input}
                  value={noteText}
                  onChangeText={t => setNoteText(t.slice(0, NOTE_LIMIT))}
                  placeholder="e.g. Assalamu Alaikum, I came across your profile and felt we might be compatible…"
                  placeholderTextColor={Colors.ink3}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={noteStyles.counter}>{noteText.length}/{NOTE_LIMIT}</Text>

                <View style={noteStyles.modalBtnRow}>
                  <Pressable
                    onPress={closeNoteModal}
                    disabled={sending}
                    style={({ pressed }) => [noteStyles.cancelBtn, { opacity: sending ? 0.4 : pressed ? 0.7 : 1 }]}>
                    <Text style={noteStyles.cancelText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    disabled={sending}
                    onPress={async () => {
                      if (sending) return;
                      const note = noteText.trim();
                      setSending(true);
                      try {
                        await onSendProposal?.(note);
                      } catch {}
                      setSending(false);
                      closeNoteModal();
                      setActiveButton('sendProposal');
                      animateOut(() => {});
                    }}
                    style={({ pressed }) => [noteStyles.sendBtn, { opacity: sending ? 0.7 : pressed ? 0.88 : 1 }]}>
                    <LinearGradient
                      colors={['#F2559A', '#E6396E']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={noteStyles.sendBtnInner}>
                      {sending
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={noteStyles.sendText}>Send proposal</Text>}
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.page,
  },

  // Fixed filter button — rendered outside ScrollView so it never scrolls
  filterBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },

  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },

  // Sticky greeting — sits above the ScrollView, never scrolls
  stickyHdr: {
    paddingLeft: 20,
    /**
     * Clears the three floating buttons Home overlays on this same band.
     *
     * They are absolutely positioned from the right edge (see CHROME_RIGHT in
     * HomeScreen: bell 108, filter 62, menu 16, each 38 wide), so the outermost
     * reaches 146px in. With only `paddingHorizontal: 20` a long name ran
     * underneath them — invisible on a wide phone, overlapping on a narrow one
     * like a folded Galaxy Fold at ~280dp.
     */
    paddingRight: 152,
    paddingBottom: 13,
    backgroundColor: Colors.page,
  },
  hdrSalam: { fontSize: 13.5, color: '#9695A5' },
  hdrName: { fontSize: 25, fontWeight: '700', letterSpacing: -0.6, color: '#17171F', marginTop: 1 },

  // ── Hero card ──────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 20,
    padding: 20,
    // Clips the gradient to the rounded corners; the View itself is sized by
    // its content, so nothing of the content is ever clipped.
    overflow: 'hidden',
  },
  // Fills the card behind the content. Absolute, so it takes the View's final
  // height rather than trying to establish one.
  heroFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },

  greenpulse: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#3FCF9A',
    shadowColor: '#3FCF9A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 2,
  },

  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#CFC4F5',
  },

  heroHeading: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 33,
    color: '#fff',
    marginBottom: 10,
  },

  heroPara: {
    fontSize: 13,
    color: '#CBC1EE',
    lineHeight: 21,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },

  statCell: {
    flex: 1,
  },

  statCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.14)',
    paddingLeft: 20,
  },

  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },

  statLabel: {
    fontSize: 10.5,
    color: '#B5A9E4',
    marginTop: 2,
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: -0.1,
  },

  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  nearestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.vioSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },

  nearestText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.vioInk,
    letterSpacing: 0.2,
  },

  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink3,
  },

  // Distance label inside profile card header
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },

  distanceText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.vioD,
  },

  // ── Introduction card ──────────────────────────────────────────────────────
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 19,
    paddingBottom: 14,
  },

  cardHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },

  whoText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.5,
  },

  whoName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink2,
    marginTop: 2,
  },

  whoSub: {
    fontSize: 12.5,
    color: Colors.ink2,
    marginTop: 3,
    lineHeight: 18,
  },

  badgeGroup: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 5,
    marginLeft: 10,
    flexShrink: 0,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // ── Photo placeholder ──────────────────────────────────────────────────────
  photoPlaceholder: {
    marginHorizontal: 19,
    borderRadius: 18,
    backgroundColor: '#EEECF8',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  photoLockText: {
    fontSize: 11.5,
    color: '#7B74A8',
    fontWeight: '600',
  },

  // ── Profile rows ───────────────────────────────────────────────────────────
  profileRows: {
    marginTop: 12,
    paddingHorizontal: 19,
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

  // ── Bio ────────────────────────────────────────────────────────────────────
  bioText: {
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 20,
    marginHorizontal: 19,
    marginTop: 12,
  },

  // ── Lock note ──────────────────────────────────────────────────────────────
  lockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 19,
    marginTop: 14,
    padding: 12,
    backgroundColor: Colors.page,
    borderRadius: 12,
  },

  lockText: {
    flex: 1,
    fontSize: 11.5,
    color: Colors.ink2,
    lineHeight: 17,
  },

  lockBold: {
    fontWeight: '700',
    color: Colors.ink,
  },

  // ── Action buttons ─────────────────────────────────────────────────────────
  actionsCol: {
    gap: 10,
    padding: 19,
    paddingTop: 14,
  },

  btnViewProfile: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(155,123,240,0.3)',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnViewProfileText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.vioInk,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  btnOutline: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(155,123,240,0.3)',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnOutlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.vioInk,
  },

  btnPrimary: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },

  btnPrimaryInner: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },

  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.vioSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 10,
  },

  emptyBody: {
    fontSize: 13.5,
    color: Colors.ink2,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },

  emptyActions: {
    width: '100%',
    gap: 10,
  },

  emptyBtnOutline: {
    height: 50,
    borderRadius: 15,
    borderWidth: 1.6,
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

  emptyBtnOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.vioInk,
  },

  emptyBtnGhost: {
    height: 50,
    borderRadius: 15,
    backgroundColor: Colors.vioSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  emptyBtnGhostText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.vioInk,
  },
});

// ─── skeleton styles ──────────────────────────────────────────────────────────
const skStyles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  hdr: {
    paddingHorizontal: 4,
    paddingTop: 11,
    paddingBottom: 13,
  },
  hero: {
    borderRadius: 20,
    padding: 20,
      // Clips the background gradient to the rounded corners. The View
    // itself is sized by its content, so the content is never clipped.
    overflow: 'hidden',
},
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.14)',
    paddingLeft: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 19,
    paddingBottom: 14,
  },
  rows: {
    paddingHorizontal: 19,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },
  lockBox: {
    margin: 19,
    marginTop: 8,
    padding: 14,
    backgroundColor: Colors.page,
    borderRadius: 12,

  },
  btns: {
    padding: 19,
    paddingTop: 14,
    gap: 10,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

// ─── note modal styles ─────────────────────────────────────────────────────────
const noteStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,22,48,0.5)',
  },
  sheet: {
    backgroundColor: Colors.page,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(155,123,240,0.3)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Colors.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 19,
    marginBottom: 16,
  },
  input: {
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.25)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14.5,
    color: Colors.ink,
    lineHeight: 21,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  counter: {
    fontSize: 11,
    color: Colors.ink3,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink2,
  },
  sendBtn: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sendBtnInner: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});
