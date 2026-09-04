/**
 * HomeScreen — shown when the user reopens the app after completing onboarding.
 *
 * Priority order for pending states:
 *   profileIncomplete    → H6 (onboarding abandoned mid-flow, highest priority)
 *   paymentFailed        → H5 (payment failed)
 *   faceFailed           → H3 (face scan failed)
 *   cnicFailed           → H4 (CNIC resubmit, after face is resolved)
 *   underReviewUnpaid    → H8 (verified but not paid, profile under review)
 *   proposalsReadyUnpaid → H12 (verified, candidates available, payment not yet made)
 *   introductionAvailable→ H16 (paid member, introductions ready — or empty city state)
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { VerificationBlock } from '../../components/verification/VerificationBlock';
import { PaymentFailedBlock } from '../../components/payment/PaymentFailedBlock';
import { UnderReviewUnpaidBlock } from '../../components/review/UnderReviewUnpaidBlock';
import { MatchesFoundUnpaidBlock } from '../../components/matches/MatchesFoundUnpaidBlock';
import { IntroductionAvailableBlock, IntroductionProfile } from '../../components/introduction/IntroductionAvailableBlock';
import {
  ProfileIncompleteBlock,
  allSectionsDone,
  allServerSectionsDone,
} from '../../components/onboarding/ProfileIncompleteBlock';
import type { ProfileCompletion } from '../../api/profile';
import { UnderReviewScreen } from '../onboarding/UnderReviewScreen';
import { WaliRequiredBlock } from '../../components/review/WaliRequiredBlock';
import { ProposalsScreen } from './ProposalsScreen';
import { ProposalDetailScreen, type ProposalDetailSelection } from './ProposalDetailScreen';
import { FamilyScreen, type WaliState } from './FamilyScreen';
import { Bone } from '../../components/ui/Skeleton';
import { BottomNav, NavTab } from '../../components/ui/BottomNav';
import { Colors } from '../../theme/colors';
import { Coords } from '../../utils/location';

// ─── filter icon (sliders) ────────────────────────────────────────────────────
/**
 * Right-edge offsets for the two floating top-bar buttons.
 *
 * The menu sits on the outside — it is the screen's own control, while the
 * filter acts on the content below it. Named once because the skeletons that
 * stand in for these buttons have to line up with them exactly.
 */
const CHROME_RIGHT = { menu: 16, filter: 62, bell: 108 } as const;

function BellIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vioInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
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

// ─── menu (burger) icon ───────────────────────────────────────────────────────
function MenuIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16M4 12h16M4 18h16" stroke={Colors.vioInk} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

interface HomeScreenProps {
  /** First name shown in the greeting header */
  userName?: string;
  /** Payment failed — shows H5 */
  paymentFailed?: boolean;
  /** Face scan explicitly failed — shows H3 */
  faceFailed?: boolean;
  /** CNIC verification failed — shows H4 (only after face is resolved) */
  cnicFailed?: boolean;
  /** Remaining face scan attempts */
  faceAttemptsLeft?: number;
  /** User authenticated but never finished onboarding — shows H6 */
  profileIncomplete?: boolean;
  /** Verification submitted & pending, payment not yet made — shows H8 */
  underReviewUnpaid?: boolean;
  /** Verification pending AND payment made — shows H9 */
  underReviewPaid?: boolean;
  /** Verified and paid, but no wali — not discoverable and cannot propose. */
  waliRequired?: boolean;
  /**
   * Whether the membership is paid for, from the home state.
   *
   * Gates the wali card, which states outright that the membership is active
   * and that a guardian is the only thing missing. The server's WALI_REQUIRED
   * does not itself imply payment, so an unpaid account was shown a card
   * claiming it had paid — and asked for a wali instead of the membership that
   * was actually blocking it. Unpaid, the caller resolves that state to one of
   * the membership prompts instead.
   */
  isPaidMember?: boolean;
  onAddWali?: () => void;
  /** The server's section-by-section profile completion, when loaded. */
  profileCompletion?: ProfileCompletion;
  /** The section report is still loading — H6 shows bones, not a guess. */
  profileCompletionLoading?: boolean;
  /**
   * Whether the home-state fetch has answered at least once.
   *
   * The five server-derived states below are only meaningful after it has. Until
   * then they sit at their defaults, which read as a real answer: a user who had
   * just verified and paid was shown the review card's "One step left / Verify
   * my identity" copy, because `verificationPending` had not been told otherwise
   * yet and `underReviewPaid` was set optimistically by the payment screen.
   * Defaults to true so callers that pass real flags directly are unaffected.
   */
  homeStateLoaded?: boolean;
  /** Server reports a verification actually awaiting review, not merely absent. */
  verificationPending?: boolean;
  /** Some verification types submitted, but not all. */
  verificationPartial?: boolean;
  /** Identity verification approved — H12 is reachable without it. */
  verificationApproved?: boolean;
  onStartVerification?: () => void;
  /** Verified, proposals available, payment not yet made — shows H12 */
  proposalsReadyUnpaid?: boolean;
  /** Google Play's localised membership price, threaded to the paywall blocks. */
  priceLabel?: string | null;
  /** Number of candidate profiles for H12 */
  matchCount?: number;
  /** Paid member with introductions ready today — shows H16 */
  introductionAvailable?: boolean;
  /** true = show intro card; false = show "no profiles in city" empty state */
  hasIntroductions?: boolean;
  /** City name for the H16 empty state */
  introductionCity?: string;
  /** Profile data for H16 introduction card */
  introductionProfile?: IntroductionProfile;
  /** H16 hero stat: profiles matching criteria */
  matchCriteria?: number;
  /** H16 hero stat: users who reviewed this profile this week */
  reviewedThisWeek?: number;
  /** Which introduction this is today (e.g. 1) */
  introductionIndex?: number;
  /** Total introductions available today (e.g. 3) */
  totalIntroductions?: number;
  /** User's stored GPS coordinates — used to compute distance to each profile */
  userCoords?: Coords;
  /** H16: "Not suitable" tapped */
  onNotSuitable?: () => void;
  /** H16: "View profile" tapped → opens ProfileDetailScreen (introduction card) */
  onViewProfile?: () => void;
  /** Proposals: "View profile" tapped → opens ProfileDetailScreen for the given userId */
  onViewProposalProfile?: (userId: string, type: 'sent' | 'received', matchId: string | null) => void;
  /** Proposals: called after a proposal is successfully withdrawn — refresh home feed */
  onProposalWithdrawn?: () => void;
  /**
   * Accept or decline a proposal that has reached the user, by its sender.
   *
   * Without these the received-proposal screen rendered both buttons with no
   * handler behind them, so tapping Accept fired no request.
   */
  onAcceptProposal?: (fromUserId: string) => void | Promise<void>;
  onDeclineProposal?: (fromUserId: string) => void | Promise<void>;
  /** Open the conversation for an accepted proposal. */
  onOpenProposalChat?: (matchId: string | null) => void;
  /** H16: "Send proposal" tapped */
  /**
   * Forwarded to IntroductionAvailableBlock, which has a note field — so the
   * note has to travel through this type. Declared as taking none, it was
   * being dropped between the block and App's handler.
   */
  onSendProposal?: (note?: string) => void | Promise<void>;
  /** H16: "Request photo" tapped (from ProfileDetailScreen) */
  onRequestPhoto?: () => void;
  /** H16 empty state: "Change city" tapped */
  onChangeCity?: () => void;
  /** H16 empty state: "Adjust filters" tapped */
  onAdjustFilters?: () => void;
  /** H5: retry payment */
  onRetryPayment?: () => void;
  /** H5: change payment method */
  onChangePaymentMethod?: () => void;
  /** H3: retry face scan */
  onRetryFace?: () => void;
  /** H4: upload CNIC */
  onUploadCnic?: () => void;
  /** H6: the screen to resume — used to show step progress */
  resumeScreen?: string;
  /** H6: resume onboarding from last step */
  /** Receives the screen of the first outstanding section, when known. */
  onContinueOnboarding?: (target?: string) => void;
  /** H8 / H12: go to payment screen */
  onBecomeAMember?: () => void;
  /** H8: confirm wali */
  /** H8: improve biodata */
  onImproveBiodata?: () => void;
  /** H8: review preferences */
  onReviewPreferences?: () => void;
  /** H8: when the user submitted verification — drives the "Xh ago" stat */
  verificationSubmittedAt?: Date;
  /** Filter icon tapped — opens H11 (narrow criteria screen) */
  onOpenFilters?: () => void;
  /** Pull-to-refresh — reload introductions and stats */
  onRefresh?: () => Promise<void>;
  /** Show skeleton loader while introductions API is loading */
  introductionsLoading?: boolean;
  /** Currently active bottom nav tab */
  activeTab?: NavTab;
  /** Bottom nav tab tapped */
  onTabChange?: (tab: NavTab) => void;
  /** Signed-in user's id — drives the Proposals realtime subscription. */
  userId?: string;
  /** Proposals header → photo requests queue. */
  onPhotoRequests?: () => void;
  /** Bell icon tapped → opens the notification feed. */
  onOpenNotifications?: () => void;
  /** Unread notifications, badged on the bell. */
  notificationsBadge?: number;
  /** Photo requests waiting on this user — shown on that header link. */
  photoRequestsBadge?: number;
  /** Badge count on Proposals tab */
  proposalsBadge?: number;
  /**
   * Badge count on the Chats tab: how many conversations have messages the
   * user has not read. Counts conversations, not messages — the question is
   * "who is waiting on me", not "how much is unread".
   */
  chatsBadge?: number;
  /** Increment to trigger a silent refresh of the Proposals tab */
  proposalsRefreshKey?: number;
  /** Called when the received proposals count changes — used to drive the badge */
  onProposalsBadgeChange?: (count: number) => void;
  /** Settings (burger) icon tapped — opens SettingsScreen */
  onOpenSettings?: () => void;
  /** Wali state for the Family tab */
  /** Family tab — wali action callbacks */
  onAskWaliAgain?: () => void;
  onChooseAnotherWali?: () => void;
  onReviewProposal?: () => void;
  onSwitchToProfile?: () => void;
}

export function HomeScreen({
  userName = '',
  paymentFailed = false,
  faceFailed = false,
  cnicFailed = false,
  faceAttemptsLeft = 2,
  profileIncomplete = false,
  resumeScreen = 'WhoIsFor',
  underReviewUnpaid = false,
  underReviewPaid = false,
  waliRequired = false,
  isPaidMember = false,
  homeStateLoaded = true,
  onAddWali,
  profileCompletion,
  profileCompletionLoading = false,
  verificationPending = true,
  verificationPartial = false,
  verificationApproved = false,
  onStartVerification,
  proposalsReadyUnpaid = false,
  priceLabel,
  // 0, not a sample figure: an unpassed count must not read as a real one.
  matchCount = 0,
  introductionAvailable = false,
  hasIntroductions = true,
  introductionCity = 'your city',
  introductionProfile,
  matchCriteria = 0,
  reviewedThisWeek = 0,
  introductionIndex,
  totalIntroductions,
  userCoords,
  onNotSuitable,
  onViewProfile,
  onViewProposalProfile,
  onProposalWithdrawn,
  onAcceptProposal,
  onDeclineProposal,
  onOpenProposalChat,
  onSendProposal,
  onRequestPhoto,
  onChangeCity,
  onAdjustFilters,
  onRetryPayment,
  onChangePaymentMethod,
  onRetryFace,
  onUploadCnic,
  onContinueOnboarding,
  onBecomeAMember,
  onImproveBiodata,
  onReviewPreferences,
  verificationSubmittedAt,
  onOpenFilters,
  onRefresh,
  introductionsLoading = false,
  activeTab = 'home',
  onTabChange,
  userId,
  onPhotoRequests,
  photoRequestsBadge,
  onOpenNotifications,
  notificationsBadge = 0,
  proposalsBadge,
  chatsBadge,
  proposalsRefreshKey,
  onProposalsBadgeChange,
  onOpenSettings,
  onAskWaliAgain,
  onChooseAnotherWali,
  onReviewProposal,
  onSwitchToProfile,
}: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [proposalDetail, setProposalDetail] = useState<ProposalDetailSelection | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;

  const openDetail = useCallback((sel: ProposalDetailSelection) => {
    setProposalDetail(sel);
    setDetailVisible(true);
    slideAnim.setValue(screenWidth);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim, screenWidth]);

  const closeDetail = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: screenWidth,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setProposalDetail(null);
      setDetailVisible(false);
    });
  }, [slideAnim, screenWidth]);

  // ── Tab slide animation ────────────────────────────────────────────────────
  const TAB_ORDER: NavTab[] = ['home', 'proposals', 'chats', 'family'];
  const prevTabRef = useRef<NavTab>(activeTab);
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    const prevIndex = TAB_ORDER.indexOf(prevTabRef.current);
    const nextIndex = TAB_ORDER.indexOf(activeTab);
    prevTabRef.current = activeTab;
    if (prevIndex === nextIndex) return;
    const dir = nextIndex > prevIndex ? 1 : -1;
    tabSlideAnim.setValue(dir * screenWidth);
    Animated.timing(tabSlideAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const nav = (
    <BottomNav
      activeTab={activeTab}
      onTabChange={onTabChange}
      badges={{ proposals: proposalsBadge, chats: chatsBadge }}
    />
  );

  /**
   * The page is still resolving what it is.
   *
   * These two buttons are absolutely-positioned overlays, so they sit outside
   * whichever block draws the skeleton and stayed fully live over it — two real
   * controls on a page of placeholders, tappable before the state that decides
   * whether they should exist had arrived.
   */
  const chromeLoading = !homeStateLoaded || introductionsLoading;

  // Absolutely-positioned filter button — overlaid on every home state except
  // H3/H4 (verification failures, where the user needs to act on verification).
  const filterOverlay = onOpenFilters ? (
    chromeLoading ? (
      <Bone w={38} h={38} radius={14} style={[styles.chromeBone, { right: CHROME_RIGHT.filter, top: insets.top + 8 }]} />
    ) : (
      <Pressable
        onPress={onOpenFilters}
        hitSlop={8}
        style={[styles.filterBtn, { top: insets.top + 8 }]}>
        <FilterIcon />
      </Pressable>
    )
  ) : null;

  // Notification bell — outermost of the three, since it is about the account
  // rather than the page under it.
  const bellOverlay = onOpenNotifications ? (
    chromeLoading ? (
      <Bone w={38} h={38} radius={14} style={[styles.chromeBone, { right: CHROME_RIGHT.bell, top: insets.top + 8 }]} />
    ) : (
      <Pressable
        onPress={onOpenNotifications}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          notificationsBadge > 0
            ? `Notifications, ${notificationsBadge} unread`
            : 'Notifications'
        }
        style={[styles.bellBtn, { top: insets.top + 8 }]}>
        <BellIcon />
        {notificationsBadge > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>
              {notificationsBadge > 9 ? '9+' : notificationsBadge}
            </Text>
          </View>
        )}
      </Pressable>
    )
  ) : null;

  // Absolutely-positioned settings (burger) button — top-right of home
  const settingsOverlay = onOpenSettings ? (
    chromeLoading ? (
      <Bone w={38} h={38} radius={14} style={[styles.chromeBone, { right: CHROME_RIGHT.menu, top: insets.top + 8 }]} />
    ) : (
      <Pressable
        onPress={onOpenSettings}
        hitSlop={8}
        style={[styles.settingsBtn, { top: insets.top + 8 }]}>
        <MenuIcon />
      </Pressable>
    )
  ) : null;

  // ── Build page content (single return so the tab animation wrapper is consistent)
  let pageContent: React.ReactNode;

  // Whether anything is actually outstanding. The server's section report is
  // the authority; `resumeScreen` only stands in until it arrives. Judging it
  // from `resumeScreen` alone left a hole: the verification and payment steps
  // move it past every profile section, so a profile the server still called
  // incomplete satisfied both this test and the block's own all-done guard,
  // and home fell through to a page with nothing on it but the burger button.
  //
  // While the report is still loading there is no answer to give, and the
  // `resumeScreen` fallback is a guess that reads as "further along than the
  // server agrees" — deciding on it here swapped H6 for another block for a
  // moment, then swapped back. Nothing is outstanding-free until we know.
  const nothingOutstanding = profileCompletion
    ? allServerSectionsDone(profileCompletion)
    : profileCompletionLoading
      ? false
      : allSectionsDone(resumeScreen);

  if (profileIncomplete && !nothingOutstanding) {
    pageContent = (
      <>
        {/* No filter or menu here. There is no feed to narrow until the
            biodata is done, and the card's one job is to send the user into
            it — two floating controls over the top of that are the only things
            competing with it. */}
        <ProfileIncompleteBlock
          userName={userName}
          resumeScreen={resumeScreen}
          completion={profileCompletion}
          loading={profileCompletionLoading}
          onContinue={onContinueOnboarding}
        />
      </>
    );
  } else if (paymentFailed) {
    pageContent = (
      <>
        <PaymentFailedBlock
          userName={userName}
          onRetry={onRetryPayment}
          onChangeMethod={onChangePaymentMethod}
        />
        {filterOverlay}
        {bellOverlay}
        {settingsOverlay}
      </>
    );
  } else if (faceFailed) {
    pageContent = (
      <VerificationBlock
        userName={userName}
        variant="face"
        attemptsLeft={faceAttemptsLeft}
        onAction={onRetryFace}
      />
    );
  } else if (cnicFailed) {
    pageContent = (
      <VerificationBlock
        userName={userName}
        variant="cnic"
        onAction={onUploadCnic}
      />
    );
  } else if (homeStateLoaded && waliRequired && isPaidMember) {
    pageContent = (
      <>
        <WaliRequiredBlock userName={userName} onAddWali={onAddWali} />
        {filterOverlay}
        {bellOverlay}
        {settingsOverlay}
      </>
    );
  } else if (homeStateLoaded && underReviewUnpaid) {
    pageContent = (
      <>
        <UnderReviewUnpaidBlock
          userName={userName}
          onBecomeAMember={onBecomeAMember}
          onImproveBiodata={onImproveBiodata}
          onReviewPreferences={onReviewPreferences}
          submittedAt={verificationSubmittedAt}
          priceLabel={priceLabel}
        />
        {filterOverlay}
        {bellOverlay}
        {settingsOverlay}
      </>
    );
  } else if (homeStateLoaded && underReviewPaid) {
    pageContent = (
      <>
        <UnderReviewScreen
          onGoHome={undefined}
          verificationPending={verificationPending}
          verificationPartial={verificationPartial}
          onStartVerification={onStartVerification}
          onImproveBiodata={onImproveBiodata}
          onReviewPreferences={onReviewPreferences}
        />
        {filterOverlay}
        {bellOverlay}
        {settingsOverlay}
      </>
    );
  } else if (homeStateLoaded && proposalsReadyUnpaid) {
    pageContent = (
      <>
        <MatchesFoundUnpaidBlock
          userName={userName}
          matchCount={matchCount}
          onBecomeAMember={onBecomeAMember}
          priceLabel={priceLabel}
          verified={verificationApproved}
          onStartVerification={onStartVerification}
        />
        {filterOverlay}
        {bellOverlay}
        {settingsOverlay}
      </>
    );
  } else if (homeStateLoaded && introductionAvailable) {
    pageContent = (
      <>
        <IntroductionAvailableBlock
          userName={userName}
          hasIntroductions={hasIntroductions}
          city={introductionCity}
          profile={introductionProfile}
          matchCriteria={matchCriteria}
          reviewedThisWeek={reviewedThisWeek}
          introductionIndex={introductionIndex}
          totalIntroductions={totalIntroductions}
          userCoords={userCoords}
          onNotSuitable={onNotSuitable}
          onViewProfile={onViewProfile}
          onSendProposal={onSendProposal}
          onChangeCity={onChangeCity}
          onAdjustFilters={onAdjustFilters}
          onRefresh={onRefresh}
          isLoading={introductionsLoading}
          onOpenFilters={onOpenFilters}
        />
        {filterOverlay}
        {bellOverlay}
        {settingsOverlay}
      </>
    );
  } else {
    // Either the first home-state response has not landed yet, or it has and
    // every state maps to one of the branches above. A spinner rather than the
    // bare burger button on an empty page — and, for the states the server owns,
    // rather than a guess made from their defaults.
    pageContent = (
      <>
        {/* The shape every branch above resolves to: a greeting, a hero card,
            then a content card. A spinner said "waiting" without saying what
            for, and the page then jumped as the real layout replaced it. */}
        <View style={styles.fallbackSkeleton}>
          <Bone w={132} h={13} radius={6} />
          <Bone w={182} h={26} radius={9} style={{ marginTop: 8 }} />
          <Bone w={'100%'} h={196} radius={20} style={{ marginTop: 22 }} />
          <Bone w={'100%'} h={228} radius={22} style={{ marginTop: 14 }} />
        </View>
        {bellOverlay}
        {settingsOverlay}
      </>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Animated page content — slides on tab change, nav excluded */}
      <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: tabSlideAnim }] }, (activeTab === 'proposals' || activeTab === 'family') && { display: 'none' }]}>
        {pageContent}
      </Animated.View>

      {/* Proposals tab — always mounted so state + subscription survive tab switches */}
      <View style={[StyleSheet.absoluteFill, { display: activeTab === 'proposals' ? 'flex' : 'none' }]}>
        <ProposalsScreen
          onSeeIntroduction={onViewProfile}
          onSelectProposal={openDetail}
          refreshKey={proposalsRefreshKey}
          userId={userId}
          onPhotoRequests={onPhotoRequests}
          photoRequestsBadge={photoRequestsBadge}
          onReceivedCountChange={onProposalsBadgeChange}
        />
      </View>

      {/* Family tab — always mounted so wali data is not re-fetched on every tab switch */}
      <View style={[StyleSheet.absoluteFill, { display: activeTab === 'family' ? 'flex' : 'none' }]}>
        {/* `waliState`, `onRemindWali` and `onChangeWali` used to be passed
            here but are not FamilyScreenProps — the screen resolves its own
            state and never received them. Dropped rather than left as a silent
            no-op that reads like wiring. */}
        <FamilyScreen
          // Inviting a wali is part of membership, so the tab shows what it
          // costs rather than a form the server will refuse.
          isPaidMember={isPaidMember}
          onBecomeAMember={onBecomeAMember}
          priceLabel={priceLabel}
          onBack={() => onTabChange?.('home')}
          onAskWaliAgain={onAskWaliAgain}
          onChooseAnotherWali={onChooseAnotherWali}
          onReviewProposal={onReviewProposal}
          onSwitchToProfile={() => { onTabChange?.('home'); onSwitchToProfile?.(); }}
        />
      </View>

      {/* Bottom nav — always fixed, never animates */}
      {nav}

      {/* Proposal detail overlay — covers full screen including nav */}
      {detailVisible && proposalDetail && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX: slideAnim }], backgroundColor: '#F6F5FA' },
          ]}>
          <ProposalDetailScreen
            selected={proposalDetail}
            onBack={closeDetail}
            onWithdrawSuccess={onProposalWithdrawn}
            onViewProfile={onViewProposalProfile}
            onAccept={async fromUserId => { await onAcceptProposal?.(fromUserId); closeDetail(); }}
            onDecline={async fromUserId => { await onDeclineProposal?.(fromUserId); closeDetail(); }}
            onOpenChat={matchId => { closeDetail(); onOpenProposalChat?.(matchId); }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.page,
  },
  wrapper: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.page,
  },
  // Same footprint and corner radius as the two real buttons, so nothing
  // shifts when the page resolves.
  // Stands in for the whole page while the home state resolves.
  fallbackSkeleton: { paddingHorizontal: 20, paddingTop: 70 },

  chromeBone: {
    position: 'absolute',
    zIndex: 10,
  },

  // Same 38x38 chrome as the other two; only the offset and contents differ.
  bellBtn: {
    position: 'absolute',
    right: CHROME_RIGHT.bell,
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
    shadowRadius: 12,
    elevation: 3,
  },
  // Overhangs the corner, so it reads as attached to the bell rather than
  // crowding the glyph.
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#E6396E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F6F5FA',
  },
  bellBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#fff' },

  filterBtn: {
    position: 'absolute',
    right: CHROME_RIGHT.filter,
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
    elevation: 3,
  },
  settingsBtn: {
    position: 'absolute',
    right: CHROME_RIGHT.menu,
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
    elevation: 3,
  },
});
