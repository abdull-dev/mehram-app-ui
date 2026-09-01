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
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

// Horizontal padding the photo row sits inside (16px each side).
const PHOTO_ROW_INSET = 32;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors } from '../../theme/colors';
import { pronounsFor } from '../../lib/proposalSteps';
import { IntroductionProfile } from '../../components/introduction/IntroductionAvailableBlock';
import { formatHeight } from '../../utils/height';
import {
  EDUCATION_LABELS,
  EMPLOYMENT_LABELS,
  FIELD_OF_STUDY_LABELS,
  GENDER_LABELS,
  MADHHAB_LABELS,
  MARITAL_LABELS,
  PRAYER_LABELS,
  RELIGIOSITY_LABELS,
  SECT_LABELS,
  labelFor,
} from '../../utils/enumLabels';

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

function LockIcon({ color = Colors.vio }: { color?: string } = {}) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={11} width={16} height={10} rx={2.5} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
/** Full-window photo viewer, opened by tapping a photo in the carousel. */
function PhotoLightbox({ urls, startIndex, onClose }: {
  urls: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  // `useWindowDimensions` re-renders on window resize; a module-scope
  // `Dimensions.get` froze at launch, so a folding phone kept the folded
  // width and the viewer stopped filling the screen after unfolding.
  const win = useWindowDimensions();
  const [index, setIndex] = useState(startIndex);
  // `useRef<ScrollView>` is the pattern used elsewhere in this repo, but under
  // these RN types it refers to the component, not the instance — which is why
  // those call sites sit in the type-error baseline. This is the instance type.
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      // Android's hardware back closes the viewer rather than the screen behind
      // it, which is what a full-screen overlay is expected to do.
      onRequestClose={onClose}>
      <View style={lightboxStyles.root}>
        <StatusBar barStyle="light-content" />

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          // Opening on the photo that was tapped, not always the first.
          // `contentOffset` alone is unreliable on Android, so the offset is
          // also applied once the scroller has a width to measure against.
          contentOffset={{ x: startIndex * win.width, y: 0 }}
          onLayout={() =>
            scroller.current?.scrollTo({
              x: startIndex * win.width,
              animated: false,
            })
          }
          scrollEventThrottle={16}
          onScroll={e =>
            setIndex(
              Math.round(e.nativeEvent.contentOffset.x / win.width),
            )
          }>
          {urls.map((url, i) => (
            <Image
              key={i}
              source={{ uri: url }}
              // `contain`, not `cover`: this is the view for looking at the
              // photo, so nothing should be cropped out of it.
              resizeMode="contain"
              style={{ width: win.width, height: win.height }}
            />
          ))}
        </ScrollView>

        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          style={({ pressed }) => [
            lightboxStyles.close,
            { top: insets.top + 10 },
            pressed && { opacity: 0.7 },
          ]}>
          <Text style={lightboxStyles.closeText}>✕</Text>
        </Pressable>

        {urls.length > 1 && (
          <View style={[lightboxStyles.counter, { bottom: insets.bottom + 22 }]}>
            <Text style={lightboxStyles.counterText}>
              {index + 1} / {urls.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const lightboxStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  close: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 17, fontWeight: '700', lineHeight: 20 },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  counterText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
});

/**
 * `overlay` renders inside the photo box, above the images.
 *
 * Taken as a child rather than stacked by the caller because the paging dots
 * sit in flow *below* that box: an absolutely-positioned overlay anchored to
 * the caller's container would have covered them.
 */
function PhotoCarousel({ urls, overlay }: { urls: string[]; overlay?: React.ReactNode }) {
  const [activeIndex, setActiveIndex] = useState(0);
  // Reactive, so the slide width follows a window that changes size.
  const slideW = useWindowDimensions().width - PHOTO_ROW_INSET;
  /** Which photo the full-screen viewer is open on, or null when closed. */
  const [lightboxAt, setLightboxAt] = useState<number | null>(null);

  if (urls.length === 0) {
    return (
      <View style={styles.photoWrap}>
        <View style={styles.photoInner}>
          <PersonIcon />
          <Text style={styles.photoHintText}>No photos uploaded yet</Text>
        </View>
        {overlay}
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
            const idx = Math.round(e.nativeEvent.contentOffset.x / slideW);
            setActiveIndex(idx);
          }}>
          {urls.map((url, i) => (
            // Opens the viewer on the photo that was tapped. A Pressable
            // rather than a touch handler on the Image so the paging scroll
            // still wins a horizontal drag — a tap is a tap, a swipe pages.
            <Pressable
              key={i}
              onPress={() => setLightboxAt(i)}
              accessibilityRole="imagebutton"
              accessibilityLabel={
                urls.length > 1
                  ? `Photo ${i + 1} of ${urls.length}. Opens full screen.`
                  : 'Photo. Opens full screen.'
              }>
              <Image
                source={{ uri: url }}
                style={{ width: slideW, height: 268 }}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
        {overlay}
      </View>

      {lightboxAt !== null && (
        <PhotoLightbox
          urls={urls}
          startIndex={lightboxAt}
          onClose={() => setLightboxAt(null)}
        />
      )}
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


/**
 * Thin alias so the call sites below read unchanged. The maps and the lookup now
 * live in `utils/enumLabels`; the difference is that an unmapped value is
 * humanized rather than returned raw, so nothing prints SCREAMING_SNAKE.
 */
const fmt = labelFor;
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
  /**
   * Ask for the person's photos. May return a promise — the screen waits for it
   * before claiming the request was sent.
   */
  onRequestPhoto?: () => void | Promise<void>;
  /**
   * Send a proposal. The optional note exists because the caller's handler
   * accepts one — this screen has no note field, so it always sends without,
   * and the type simply stops lying about that.
   */
  onSendProposal?: (note?: string) => void | Promise<void>;
  onWithdrawProposal?: () => void;
  onAcceptProposal?: () => void;
  onDeclineProposal?: () => void;
  onOpenChat?: () => void;
}


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
  // Declared here, with the other hooks: a skeleton early-return sits a few
  // lines below, and state declared after it would be called conditionally.
  const [requestingPhoto, setRequestingPhoto] = useState(false);
  const [photoRequestError, setPhotoRequestError] = useState<string | null>(null);

  // A fetch that failed leaves no profile and `loading` false. The skeleton is
  // the honest answer: this used to fall back to a hard-coded sample profile
  // ("Fatima S., 27, Lahore"), presenting an invented person as this user's
  // match — the same defect fixed in IntroductionAvailableBlock.
  if (loading || !profile) {
    return <ProfileDetailSkeleton onBack={onBack} insetTop={insets.top} />;
  }

  const resolvedProfile = profile;

  /**
   * Photos this viewer may actually see.
   *
   * Named `visiblePhotoUrls` while only the wali branch used it; the seeker hero
   * renders the same list now, so the name no longer implied a wali-only fact.
   */
  const visiblePhotoUrls = resolvedProfile.photoUrls ?? [];
  /**
   * Someone is actually holding these photos back.
   *
   * `photosWithheld` is the other person's privacy setting, so it has nothing to say
   * about a guardian's own ward — distinguishing the two is what separates
   * "locked" from "none uploaded", and both used to render the padlock.
   */
  const photosWithheld = !isDependent && resolvedProfile.photosWithheld;

  /**
   * The standing photo request, server-first.
   *
   * `photoRequested` is the optimistic flag set when the user taps the button;
   * it is kept, but only as an *addition* to what the server says. On its own
   * it was the whole truth, and it is lost on remount — so reopening the
   * profile forgot the request, offered it again, and the server answered "You
   * have already asked this person".
   */
  const requestState: 'none' | 'pending' | 'answered' | 'refused' =
    resolvedProfile.photoRequestStatus === 'PENDING' ? 'pending'
    : resolvedProfile.photoRequestStatus === 'APPROVED' ? 'answered'
    : resolvedProfile.photoRequestStatus === 'DECLINED' ||
      resolvedProfile.photoRequestStatus === 'REVOKED' ? 'refused'
    : photoRequested ? 'pending'
    : 'none';

  /** Pronouns for the person being viewed; they/them when gender is absent. */
  const them = pronounsFor(resolvedProfile.gender);

  /**
   * A photo can only be asked for once the proposal is accepted.
   *
   * Both `*_matched` contexts mean exactly that — they are only set when a
   * matchId exists, which the server issues on acceptance. Every other context
   * is a proposal that has not been accepted (or none sent at all), and the
   * button was live in all of them while the copy above it said photos stay
   * private until approval.
   */
  const photoRequestUnlocked =
    proposalContext === 'sent_matched' || proposalContext === 'received_matched';

  // Says which step is outstanding, not just that something is.
  const photoLockReason =
    proposalContext === 'received_pending'
      ? 'Photos stay private until the proposal is accepted. Accept it first, then you can request a photo here.'
      : proposalContext === 'sent_pending'
        ? 'Photos stay private until the proposal is accepted. You can request one here as soon as it is.'
        : 'Photos stay private until a proposal is accepted. Send a proposal first — you can request a photo once it is accepted.';

  /**
   * Marks the request sent only once it actually is.
   *
   * This used to flip to the sent state and then call the handler, which was a
   * `console.log` — so the screen reported a request that never left the
   * device, and a real failure would have looked identical to success.
   */
  async function handleRequestPhoto() {
    if (requestingPhoto) return;
    setRequestingPhoto(true);
    setPhotoRequestError(null);
    try {
      await onRequestPhoto?.();
      setPhotoRequested(true);
    } catch (e) {
      setPhotoRequestError(
        e instanceof Error ? e.message : 'Could not send the request. Please try again.',
      );
    } finally {
      setRequestingPhoto(false);
    }
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
        {/* A guardian is not a stranger to their own ward, so `photosWithheld` does
            not apply to them — it gates other people's profiles, which is every
            other profile a wali opens. Without the `isDependent` exemption a
            guardian was shown a padlock over their own ward, and an empty photo
            set was reported as "locked" when nothing was withholding it. */}
        {isWaliView ? (
          photosWithheld ? (
            <View style={styles.photoWrap}>
              <View style={styles.photoInner}>
                <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                  <Rect x={4} y={11} width={16} height={10} rx={2.5} stroke={Colors.vio} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={Colors.vio} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={styles.photoHintText}>Photos are locked</Text>
              </View>
            </View>
          ) : visiblePhotoUrls.length === 0 ? (
            <View style={styles.photoWrap}>
              <View style={styles.photoInner}>
                <PersonIcon />
                <Text style={styles.photoHintText}>
                  {isDependent ? 'No photos added yet' : 'No photos to show'}
                </Text>
              </View>
            </View>
          ) : (
            <PhotoCarousel urls={visiblePhotoUrls} />
          )
        ) : (
          /* The photos, when this viewer may see them.
             This branch hardcoded `<PersonIcon />`, so a seeker's hero was a
             placeholder on every profile no matter what: the card below could
             say "Photos are shared with you" while the hero above it showed the
             empty-avatar icon. Only the wali branch ever rendered a photo. */
          <PhotoCarousel
            urls={visiblePhotoUrls}
            /* gradient fades bottom of photo → identity overlay */
            overlay={
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
            }
          />
        )}

        {/* ── Photo request card ───────────────────────────────────────────
            Only where a request is the thing to do. There are three states
            here and the card used to collapse them into one:

              photos shown      — nothing to ask for, they are already visible
              photos withheld   — asking is exactly right
              no photos at all  — nothing exists to ask for

            The card rendered in all three, so a profile with no photos offered
            "Request photo" and the server answered "This person already shares
            their photos; no request is needed" — a confusing refusal for a
            request that should never have been offered. */}
        {!isDependent && <View style={styles.card}>
          {visiblePhotoUrls.length === 0 && !photosWithheld ? (
            /* Nothing viewable and nothing being withheld: they have no
               approved photo yet. Requesting one is not the answer — under an
               open setting the server refuses outright ("this person already
               shares their photos"), and there is nothing to unlock. Say so
               rather than leaving the card blank or offering a button that
               cannot succeed.

               Deliberately not more specific: whether a photo is awaiting
               review is the owner's business, not a viewer's. */
            <View style={styles.sentRow}>
              <View style={[styles.sentDot, { backgroundColor: Colors.ink3 }]} />
              <Text style={styles.sentText}>
                No photos to show yet. You will see them here when there are.
              </Text>
            </View>
          ) : !photosWithheld ? (
            /* Visible already — an approved request, or an owner who shares
               openly. Nothing to ask for. */
            <View style={styles.sentRow}>
              <View style={styles.sentDot} />
              <Text style={styles.sentText}>
                Photos are shared with you.
              </Text>
            </View>
          ) : requestState === 'refused' ? (
            /* Answered, but not with a yes.
               Deliberately not "declined": the server keeps a decline
               indistinguishable from silence, and this is the screen the
               requester reads. What matters here is that asking again is not
               available, which the copy conveys without naming a refusal. */
            <View style={styles.sentRow}>
              <View style={[styles.sentDot, { backgroundColor: Colors.ink3 }]} />
              <Text style={styles.sentText}>
                Photos are not shared with you.
              </Text>
            </View>
          ) : requestState === 'pending' ? (
            /* Sent state */
            <View style={styles.sentRow}>
              <View style={styles.sentDot} />
              <Text style={styles.sentText}>
                {isWaliView
                  ? 'Photo request sent on your ward\'s behalf.'
                  // Was hardcoded "she". `gender` now reaches this screen —
                  // the detail payload never carried it, so every profile was
                  // described with the same pronoun regardless of who it was.
                  : resolvedProfile.photoRequestWaitingOn === 'wali'
                    ? `Photo request sent — ${them.possessive} wali is reviewing it.`
                    : `Photo request sent — ${them.subject} will be notified when ${them.subject} next logs in.`}
              </Text>
            </View>
          ) : resolvedProfile.photoRequestsPaused ? (
            /* Paused — checked *after* the request state. A request sent before
               the owner paused is still live, and leading with "paused" hid the
               user's own pending request behind a notice about someone else. */
            <View style={styles.sentRow}>
              <View style={[styles.sentDot, { backgroundColor: '#B5820D' }]} />
              <Text style={styles.sentText}>
                This person has paused photo requests for now.
              </Text>
            </View>
          ) : (
            /* Request state — locked until the proposal is accepted */
            photoRequestUnlocked ? (
              <>
                <Text style={styles.photoReqHint}>
                  The proposal is accepted, so you can request a photo directly.
                </Text>
                <Pressable
                  onPress={handleRequestPhoto}
                  disabled={requestingPhoto}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}>
                  <LinearGradient
                    colors={['#9B7BF0', '#7C5AE0']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.photoReqBtn}>
                    {requestingPhoto ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <CameraIcon />
                    )}
                    <Text style={styles.photoReqBtnText}>
                      {requestingPhoto ? 'Sending request…' : 'Request photo'}
                    </Text>
                  </LinearGradient>
                </Pressable>
                {!!photoRequestError && (
                  <Text style={styles.photoReqError}>{photoRequestError}</Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.photoReqHint}>{photoLockReason}</Text>
                <View style={[styles.photoReqBtn, styles.photoReqBtnLocked]}>
                  <LockIcon color={Colors.ink3} />
                  <Text style={[styles.photoReqBtnText, styles.photoReqBtnTextLocked]}>
                    Request photo
                  </Text>
                </View>
              </>
            )
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
            { label: 'Height', value: formatHeight(resolvedProfile.heightCm) ?? 'Not specified' },
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
                  // Called, not passed: Pressable hands its handler a gesture
                  // event, which is not the note this now accepts.
                  onPress={() => onSendProposal?.()}
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
  // Locked until the proposal is accepted. A plain View, not a disabled
  // Pressable: there is nothing to press, and a gradient button that does
  // nothing on tap reads as broken rather than as unavailable.
  photoReqBtnLocked: {
    backgroundColor: Colors.line,
  },
  photoReqBtnTextLocked: {
    color: Colors.ink3,
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

  photoReqError: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#A31C48',
    textAlign: 'center',
    marginTop: 9,
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
