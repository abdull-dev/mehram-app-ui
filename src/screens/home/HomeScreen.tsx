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
import { Animated, Dimensions, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { VerificationBlock } from '../../components/verification/VerificationBlock';
import { PaymentFailedBlock } from '../../components/payment/PaymentFailedBlock';
import { UnderReviewUnpaidBlock } from '../../components/review/UnderReviewUnpaidBlock';
import { MatchesFoundUnpaidBlock } from '../../components/matches/MatchesFoundUnpaidBlock';
import { IntroductionAvailableBlock, IntroductionProfile } from '../../components/introduction/IntroductionAvailableBlock';
import { ProfileIncompleteBlock, allSectionsDone } from '../../components/onboarding/ProfileIncompleteBlock';
import { UnderReviewScreen } from '../onboarding/UnderReviewScreen';
import { ProposalsScreen } from './ProposalsScreen';
import { ProposalDetailScreen, type ProposalDetailSelection } from './ProposalDetailScreen';
import { FamilyScreen, type WaliState } from './FamilyScreen';
import { BottomNav, NavTab } from '../../components/ui/BottomNav';
import { Colors } from '../../theme/colors';
import { Coords } from '../../utils/location';

// ─── filter icon (sliders) ────────────────────────────────────────────────────
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
  /** H16: "Send proposal" tapped */
  onSendProposal?: () => void;
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
  onContinueOnboarding?: () => void;
  /** H8 / H12: go to payment screen */
  onBecomeAMember?: () => void;
  /** H8: confirm wali */
  onConfirmWali?: () => void;
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
  /** Badge count on Proposals tab */
  proposalsBadge?: number;
  /** Increment to trigger a silent refresh of the Proposals tab */
  proposalsRefreshKey?: number;
  /** Called when the received proposals count changes — used to drive the badge */
  onProposalsBadgeChange?: (count: number) => void;
  /** Settings (burger) icon tapped — opens SettingsScreen */
  onOpenSettings?: () => void;
  /** Wali state for the Family tab */
  waliState?: WaliState;
  /** Family tab — wali action callbacks */
  onAskWaliAgain?: () => void;
  onChooseAnotherWali?: () => void;
  onRemindWali?: () => void;
  onChangeWali?: () => void;
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
  proposalsReadyUnpaid = false,
  priceLabel,
  matchCount = 14,
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
  onConfirmWali,
  onImproveBiodata,
  onReviewPreferences,
  verificationSubmittedAt,
  onOpenFilters,
  onRefresh,
  introductionsLoading = false,
  activeTab = 'home',
  onTabChange,
  proposalsBadge,
  proposalsRefreshKey,
  onProposalsBadgeChange,
  onOpenSettings,
  waliState = 'unresponsive',
  onAskWaliAgain,
  onChooseAnotherWali,
  onRemindWali,
  onChangeWali,
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
      proposalsBadge={proposalsBadge}
    />
  );

  // Absolutely-positioned filter button — overlaid on every home state except
  // H3/H4 (verification failures, where the user needs to act on verification).
  const filterOverlay = onOpenFilters ? (
    <Pressable
      onPress={onOpenFilters}
      hitSlop={8}
      style={[styles.filterBtn, { top: insets.top + 8 }]}>
      <FilterIcon />
    </Pressable>
  ) : null;

  // Absolutely-positioned settings (burger) button — top-right of home
  const settingsOverlay = onOpenSettings ? (
    <Pressable
      onPress={onOpenSettings}
      hitSlop={8}
      style={[styles.settingsBtn, { top: insets.top + 8 }]}>
      <MenuIcon />
    </Pressable>
  ) : null;

  // ── Build page content (single return so the tab animation wrapper is consistent)
  let pageContent: React.ReactNode;

  if (profileIncomplete && !allSectionsDone(resumeScreen)) {
    pageContent = (
      <>
        <ProfileIncompleteBlock
          userName={userName}
          resumeScreen={resumeScreen}
          onContinue={onContinueOnboarding}
        />
        {filterOverlay}
        {settingsOverlay}
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
  } else if (underReviewUnpaid) {
    pageContent = (
      <>
        <UnderReviewUnpaidBlock
          userName={userName}
          onBecomeAMember={onBecomeAMember}
          onConfirmWali={onConfirmWali}
          onImproveBiodata={onImproveBiodata}
          onReviewPreferences={onReviewPreferences}
          submittedAt={verificationSubmittedAt}
          priceLabel={priceLabel}
        />
        {filterOverlay}
        {settingsOverlay}
      </>
    );
  } else if (underReviewPaid) {
    pageContent = (
      <>
        <UnderReviewScreen onGoHome={undefined} />
        {filterOverlay}
        {settingsOverlay}
      </>
    );
  } else if (proposalsReadyUnpaid) {
    pageContent = (
      <>
        <MatchesFoundUnpaidBlock
          userName={userName}
          matchCount={matchCount}
          onBecomeAMember={onBecomeAMember}
          priceLabel={priceLabel}
        />
        {filterOverlay}
        {settingsOverlay}
      </>
    );
  } else if (introductionAvailable) {
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
        {settingsOverlay}
      </>
    );
  } else {
    pageContent = settingsOverlay;
  }

  return (
    <View style={styles.wrapper}>
      {/* Animated page content — slides on tab change, nav excluded */}
      <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: tabSlideAnim }] }, (activeTab === 'proposals' || activeTab === 'family') && { display: 'none' }]}>
        {pageContent}
      </Animated.View>

      {/* Proposals tab — always mounted so state + socket survive tab switches */}
      <View style={[StyleSheet.absoluteFill, { display: activeTab === 'proposals' ? 'flex' : 'none' }]}>
        <ProposalsScreen
          onSeeIntroduction={onViewProfile}
          onSelectProposal={openDetail}
          refreshKey={proposalsRefreshKey}
          onReceivedCountChange={onProposalsBadgeChange}
        />
      </View>

      {/* Family tab — always mounted so wali data is not re-fetched on every tab switch */}
      <View style={[StyleSheet.absoluteFill, { display: activeTab === 'family' ? 'flex' : 'none' }]}>
        <FamilyScreen
          waliState={waliState}
          onBack={() => onTabChange?.('home')}
          onAskWaliAgain={onAskWaliAgain}
          onChooseAnotherWali={onChooseAnotherWali}
          onRemindWali={onRemindWali}
          onChangeWali={onChangeWali}
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
    elevation: 3,
  },
  settingsBtn: {
    position: 'absolute',
    right: 62,
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
