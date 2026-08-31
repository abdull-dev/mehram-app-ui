import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  BackHandler,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import {
  getMe,
  saveOnboardingStep,
  logout,
  verifyInviteCode,
  isPendingConfirmation,
  verifyEmailOtp,
  resendEmailOtp,
} from './src/api/auth';
import { resolvePhotoUrl } from './src/api/config';
import { getWaliMe, removeWard, getWardIntroductions, getWardProposals, getWardReceivedProposals, sendWardProposal, updateWaliDetails, toKinship } from './src/api/wali';
import type { WardProposal, WardReceivedProposal } from './src/api/wali';
import {
  verifyPurchase,
  getEntitlement,
  MEMBERSHIP_PRODUCT_ID,
  PLATFORM_PURCHASE_SOURCE,
} from './src/api/billing';
import { getIntroductions, getIntroduction, getHomeStats, skipIntroduction, MAX_DISCOVER_LIMIT, type Introduction, type FullIntroduction, type IntroductionFilters } from './src/api/introductions';
import { sendProposal, getProposalStats } from './src/api/proposals';
import {
  updateLocation,
  updateEssentials,
  updateSect,
  updateFamilyBackground,
  updatePreferences,
  updatePrompts,
  updatePhotoPrivacy,
  toGender,
  toMaritalStatus,
  toSect,
  parseDob,
} from './src/api/profile';
import { ONBOARDING_STEP, resumeFromOnboardingStep, screenForStep, stepNumberFor } from './src/onboarding/steps';
import { type IntroductionProfile } from './src/components/introduction/IntroductionAvailableBlock';
import { getAccessToken, getPendingEmail, getPendingPhone, savePendingEmail, savePendingPhone, clearTokens } from './src/storage/authStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHomeSocket } from './src/hooks/useHomeSocket';

const WALI_LOCAL_PROPOSALS_KEY = '@mehram_wali_local_proposals';
import { useProposalsSocket } from './src/hooks/useProposalsSocket';
import { useChatListSocket } from './src/hooks/useChatListSocket';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WelcomeScreen } from './src/screens/onboarding/WelcomeScreen';
import { PhoneScreen } from './src/screens/onboarding/PhoneScreen';
import { CodeScreen } from './src/screens/onboarding/CodeScreen';
import { WhoIsForScreen } from './src/screens/onboarding/WhoIsForScreen';
import { CountryScreen } from './src/screens/onboarding/CountryScreen';
import { CityScreen } from './src/screens/onboarding/CityScreen';
import { EssentialsScreen } from './src/screens/onboarding/EssentialsScreen';
import { ProgressHubScreen } from './src/screens/onboarding/ProgressHubScreen';
import { FamilyAndHomeScreen } from './src/screens/onboarding/FamilyAndHomeScreen';
import { GuidedPromptScreen } from './src/screens/onboarding/GuidedPromptScreen';
import { PreferencesScreen } from './src/screens/onboarding/PreferencesScreen';
import { PhotosScreen } from './src/screens/onboarding/PhotosScreen';
import { WaliInviteScreen } from './src/screens/onboarding/WaliInviteScreen';
import { VerificationScreen } from './src/screens/onboarding/VerificationScreen';
import { PaymentScreen } from './src/screens/onboarding/PaymentScreen';
import { DoneScreen } from './src/screens/onboarding/DoneScreen';
import { NoMatchScreen } from './src/screens/onboarding/NoMatchScreen';
import { ReturningScreen } from './src/screens/onboarding/ReturningScreen';
import { HomeScreen } from './src/screens/home/HomeScreen';
import { allSectionsDone } from './src/components/onboarding/ProfileIncompleteBlock';
import { NarrowCriteriaScreen } from './src/screens/onboarding/NarrowCriteriaScreen';
import { AdjustFiltersScreen, FilterValues } from './src/screens/home/AdjustFiltersScreen';
import { captureCurrentLocation, Coords } from './src/utils/location';
import { ProfileDetailScreen, type ProposalContext } from './src/screens/profile/ProfileDetailScreen';
import { AccountVerificationScreen } from './src/screens/onboarding/AccountVerificationScreen';
import { SignInScreen } from './src/screens/onboarding/SignInScreen';
import { SignInRoleScreen } from './src/screens/onboarding/SignInRoleScreen';
import { SettingsScreen } from './src/screens/home/SettingsScreen';
import { FamilyScreen } from './src/screens/home/FamilyScreen';
import { PrivacyScreen } from './src/screens/home/PrivacyScreen';
import { YourPhotosScreen } from './src/screens/home/YourPhotosScreen';
import { MembershipScreen } from './src/screens/home/MembershipScreen';
import { DeleteAccountScreen } from './src/screens/home/DeleteAccountScreen';
import { EditProfileScreen } from './src/screens/profile/EditProfileScreen';
import { NotificationsScreen } from './src/screens/home/NotificationsScreen';
import { LanguageScreen } from './src/screens/home/LanguageScreen';
import { BlockedPeopleScreen } from './src/screens/home/BlockedPeopleScreen';
import { ContactSupportScreen } from './src/screens/home/ContactSupportScreen';
import { LegalScreen } from './src/screens/home/LegalScreen';
import { FoundMyMatchScreen } from './src/screens/home/FoundMyMatchScreen';
import { DownloadDataScreen } from './src/screens/home/DownloadDataScreen';
import { PartnerPreferencesScreen } from './src/screens/home/PartnerPreferencesScreen';
import { WaliAccountSetupScreen } from './src/screens/wali-onboarding/WaliAccountSetupScreen';
import { WaliWelcomeScreen }      from './src/screens/wali-onboarding/WaliWelcomeScreen';
import { WaliCodeEntryScreen }    from './src/screens/wali-onboarding/WaliCodeEntryScreen';
import { WaliEmailVerifyScreen }  from './src/screens/wali-onboarding/WaliEmailVerifyScreen';
import { WaliRoleExplainScreen }  from './src/screens/wali-onboarding/WaliRoleExplainScreen';
import { WaliDetailsScreen }      from './src/screens/wali-onboarding/WaliDetailsScreen';
import { WaliSetupCompleteScreen } from './src/screens/wali-onboarding/WaliSetupCompleteScreen';
import { WaliHomeScreen, type WaliConversation } from './src/screens/home/WaliHomeScreen';
import { WaliSettingsScreen } from './src/screens/home/WaliSettingsScreen';
import { listConversations, type ChatListItem } from './src/api/chat';
import { ChatsListScreen, type ChatSummary } from './src/screens/chats/ChatsListScreen';
import { ChatThreadScreen } from './src/screens/chats/ChatThreadScreen';

// ─── screen order (used to determine slide direction) ────────────────────────
type Screen =
  | 'F1' | 'SignInRole' | 'SignIn' | 'WhoIsFor' | 'Phone' | 'AccountVerification' | 'Code'
  | 'F6' | 'F7' | 'F8' | 'F10'
  | 'F11' | 'F12' | 'F13' | 'F14' | 'F15' | 'F16' | 'F17' | 'F18'
  | 'F21' | 'F22' | 'H11' | 'Filters' | 'Home' | 'ProfileDetail'
  | 'Settings' | 'Privacy' | 'YourPhotos' | 'Membership' | 'DeleteAccount' | 'EditProfile'
  | 'Notifications' | 'Language' | 'BlockedPeople' | 'ContactSupport'
  | 'PrivacyPolicy' | 'TermsOfService' | 'RefundPolicy'
  | 'FoundMyMatch' | 'DownloadData' | 'PartnerPreferences' | 'YourWali'
  // Wali onboarding
  | 'WaliAccountSetup' | 'WaliWelcome' | 'WaliCode' | 'WaliEmailVerify' | 'WaliRole' | 'WaliDetails' | 'WaliComplete'
  // Chat
  | 'Chats' | 'ChatThread';

const SCREEN_ORDER: Screen[] = [
  // Onboarding
  'F1', 'SignInRole', 'SignIn', 'WhoIsFor',
  // Wali onboarding branch (sits between WhoIsFor and Phone)
  'WaliAccountSetup', 'WaliWelcome', 'WaliCode', 'WaliEmailVerify', 'WaliRole', 'WaliDetails', 'WaliComplete',
  'Phone', 'AccountVerification', 'Code',
  'F6', 'F7', 'F8', 'F10',
  'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18',
  // Main app
  'Home',
  // Settings and all sub-screens (depth order: Home → Settings → sub-screens → deeper)
  'Settings',
  'PartnerPreferences', 'YourWali', 'Privacy', 'YourPhotos',
  'Membership', 'EditProfile', 'Notifications', 'Language',
  'BlockedPeople', 'ContactSupport',
  'PrivacyPolicy', 'TermsOfService', 'RefundPolicy',
  'FoundMyMatch', 'DownloadData', 'DeleteAccount',
];

function navDirection(from: Screen, to: Screen): 'forward' | 'back' {
  const a = SCREEN_ORDER.indexOf(from);
  const b = SCREEN_ORDER.indexOf(to);
  // Unknown screens → always forward
  if (a === -1 || b === -1) return 'forward';
  return b >= a ? 'forward' : 'back';
}

function saveFailedMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Could not save. Please try again.';
}

function destinationForSavedStep(step: number): {
  kind: 'complete' | 'home' | 'resume';
  resumeAt?: Screen;
} {
  const outcome = resumeFromOnboardingStep(step);
  if (outcome.kind === 'done') return { kind: 'complete' };
  if (outcome.kind === 'home') return { kind: 'home' };
  const screen = outcome.screen as Screen;
  if (allSectionsDone(screen)) return { kind: 'resume', resumeAt: screen };
  return { kind: 'home', resumeAt: screen };
}

// ─── slide transition wrapper ─────────────────────────────────────────────────
const { width: W } = Dimensions.get('window');
const SLIDE_DIST = W * 0.28;
const SLIDE_DUR  = 320;
const SLIDE_EASE = Easing.bezier(0.25, 0.46, 0.45, 0.94);

interface TransitionProps {
  direction: 'forward' | 'back';
  children: React.ReactNode;
}
function ScreenTransition({ direction, children }: TransitionProps) {
  const translateX = useRef(
    new Animated.Value(direction === 'back' ? -SLIDE_DIST : SLIDE_DIST),
  ).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: SLIDE_DUR,
        easing: SLIDE_EASE,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: SLIDE_DUR - 40,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { opacity, transform: [{ translateX }] },
      ]}>
      {children}
    </Animated.View>
  );
}

// ─── app ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]     = useState<Screen>('F1');
  const [activeTab, setActiveTab] = useState<'home' | 'proposals' | 'chats' | 'family'>('home');
  const [phone, setPhone]           = useState('');
  const [phoneE164, setPhoneE164]   = useState('');
  const [userEmail, setUserEmail]   = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'self' | 'wali'>('self');
  const [waliName, setWaliName] = useState('');
  // First name shown in the greeting header on home states.
  const [userName, setUserName] = useState('');
  const [faceDone, setFaceDone] = useState(false);
  const [cnicDone, setCnicDone] = useState(false);
  const [faceFailed, setFaceFailed]         = useState(false);
  const [cnicFailed, setCnicFailed]         = useState(false);
  const [faceAttemptsLeft, setFaceAttempts] = useState(2);
  const [paymentFailed, setPaymentFailed]   = useState(false);
  const [paying, setPaying]                 = useState(false);
  const [appReady, setAppReady]             = useState(false);
  // True when verification submitted but payment skipped → H8 shows on Home.
  const [underReviewUnpaid, setUnderReviewUnpaid] = useState(false);
  // True when verified and paid but still under review → H9 shows on Home.
  const [underReviewPaid, setUnderReviewPaid] = useState(false);
  // True when verified, review passed, candidates available, but not yet paid → H12 shows on Home.
  const [proposalsReadyUnpaid, setProposalsReadyUnpaid] = useState(false);
  // True once the user is a paid member and introductions are ready → H16 shows on Home.
  // Toggle hasIntroductions to false to preview the "no profiles in your city" empty state.
  const [introductionAvailable, setIntroductionAvailable] = useState(false);
  const [hasIntroductions, setHasIntroductions] = useState(false);
  // Candidate count shown on H12 — populated from GET /matches/count.
  const [matchCount, setMatchCount] = useState(0);
  // H16 hero stats — populated from GET /matches/count.
  const [matchCriteria, setMatchCriteria]       = useState(0);
  const [reviewedThisWeek, setReviewedThisWeek] = useState(0);
  // Current introduction being shown on H16 — id used for skip/propose actions.
  const [currentIntroductionId, setCurrentIntroductionId] = useState<string | null>(null);
  // Mapped profile data for the H16 introduction card.
  const [introductionProfile, setIntroductionProfile] = useState<IntroductionProfile | undefined>(undefined);
  // Full profile data loaded when user taps "View full profile" → ProfileDetailScreen.
  const [detailProfile, setDetailProfile] = useState<IntroductionProfile | undefined>(undefined);
  // True while the profile API is in-flight — ProfileDetailScreen shows skeleton.
  const [detailLoading, setDetailLoading] = useState(false);
  // Proposal relationship context — drives which action buttons ProfileDetailScreen shows.
  const [profileProposalContext, setProfileProposalContext] = useState<ProposalContext>('none');
  // matchId for the active proposal profile (used to navigate to chat).
  const [profileMatchId, setProfileMatchId] = useState<string | null>(null);
  // Proposals tab badge + refresh
  const [proposalsBadge, setProposalsBadge] = useState(0);
  const [proposalsRefreshKey, setProposalsRefreshKey] = useState(0);
  const [viewingDependent, setViewingDependent] = useState(false);
  // Chat
  const [userId, setUserId] = useState('');
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isWali, setIsWali]                   = useState(false);

  /**
   * Applies a role to the whole shell in one move.
   *
   * `isWali` selects an entirely different set of screens, so it must always be
   * *set*, never merely set-when-true. It used to be turned on by picking "wali"
   * on WhoIsFor and then never turned off: going back and continuing as a seeker
   * left the flag on, and the seeker finished onboarding only to land on the
   * wali home. Every caller now states the role it means, including 'self'.
   */
  const applyRole = useCallback((role: 'self' | 'wali') => {
    setSelectedRole(role);
    setIsWali(role === 'wali');
  }, []);

  /** The server's role is the authority once we have it; the picker is only intent. */
  const applyServerRole = useCallback((role?: string | null) => {
    applyRole(role?.toLowerCase() === 'wali' ? 'wali' : 'self');
  }, [applyRole]);
  const [waliCodeLoading, setWaliCodeLoading] = useState(false);
  const [waliCodeError, setWaliCodeError]     = useState<string | undefined>();
  const [waliEmail, setWaliEmail]             = useState('');
  const [waliPassword, setWaliPassword]       = useState('');
  // Email-confirmation step (W3). `waliCodeSent` gates the screen's second
  // phase, so a failed send leaves the wali on the address step.
  const [waliCodeSent, setWaliCodeSent]       = useState(false);
  const [waliEmailSending, setWaliEmailSending]   = useState(false);
  const [waliEmailVerifying, setWaliEmailVerifying] = useState(false);
  const [waliEmailError, setWaliEmailError]   = useState<string | undefined>();
  const [waliDetailsSaving, setWaliDetailsSaving] = useState(false);
  const [waliDetailsError, setWaliDetailsError]   = useState<string | undefined>();
  const [dependentName, setDependentName]     = useState('');
  const [dependentProfile, setDependentProfile] = useState<import('./src/api/wali').WaliMeResponse['ward']>(null);
  const [dependentPhotos, setDependentPhotos] = useState<Array<{ id: string; url: string }>>([]);
  const [waliLoading, setWaliLoading] = useState(false);
  const [wardIntroductions, setWardIntroductions] = useState<import('./src/api/introductions').Introduction[]>([]);
  const [wardProposals, setWardProposals] = useState<WardProposal[]>([]);
  // Locally-persisted proposals that the server doesn't yet return from
  // GET /wali/ward-proposals (backend stores them under the wali's userId, not
  // the ward's). Survives restarts via AsyncStorage. Remove once the backend
  // fix is live and GET /wali/ward-proposals returns these records.
  const [localWardProposals, setLocalWardProposals] = useState<WardProposal[]>([]);
  const [wardReceivedProposals, setWardReceivedProposals] = useState<WardReceivedProposal[]>([]);
  const [dependentMembershipId, setDependentMembershipId] = useState('');
  // City name shown on H16 empty-state — populated from profile city.
  const [introductionCity] = useState('');
  // True once the user has completed F18 (DoneScreen) and gone home.
  // False = user authenticated but hasn't finished onboarding → H6 shows.
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  // Tracks whether H11 was opened from the Home filter icon (vs from onboarding F13).
  const [h11FromHome, setH11FromHome] = useState(false);
  // When the user submitted their verification — passed to UnderReviewUnpaidBlock for "Xh ago".
  const [verificationSubmittedAt, setVerificationSubmittedAt] = useState<Date | undefined>(undefined);
  // Last filters applied by the user via AdjustFiltersScreen — shown on H11.
  const [appliedFilters, setAppliedFilters] = useState<FilterValues | undefined>(undefined);
  // Full preferences saved from PartnerPreferencesScreen — used as defaults for AdjustFiltersScreen.
  const [preferenceFilters, setPreferenceFilters] = useState<Partial<FilterValues> | undefined>(undefined);
  // Onboarding-captured values used as defaults in AdjustFiltersScreen.
  const [obCity, setObCity]           = useState<string>('');
  const [obSect, setObSect]           = useState<string>('');
  const [obAgeMin, setObAgeMin]       = useState<number>(24);
  const [obAgeMax, setObAgeMax]       = useState<number>(34);
  const [obMarital, setObMarital]     = useState<string>('');
  // Screen to resume when the user taps "Continue profile" on H6.
  const [resumeScreen, setResumeScreen] = useState<Screen>('F6');
  // True while the onboarding step is being saved to the DB — shows spinner on Continue button.
  /**
   * True while a Continue button's own save is in flight.
   *
   * This used to be `stepSaving`, which tracked `saveOnboardingStep` — a
   * different request from the one the screen was waiting on. The screens that
   * await their own write (essentials, family background, prompts, preferences)
   * therefore showed no loader at all during the wait that actually blocked
   * them, which is what made pressing Continue feel like nothing had happened.
   */
  const [continueBusy, setContinueBusy] = useState(false);

  /**
   * Runs a Continue button's save with the button in its loading state, then
   * advances. Guards re-entry so a double tap cannot fire the request twice.
   */
  async function saveThenAdvance(
    save: () => Promise<unknown>,
    to: Screen,
  ): Promise<void> {
    if (continueBusy) return;
    setContinueBusy(true);
    try {
      await save();
      navigateForward(to);
    } catch (err) {
      Alert.alert('Could not save', saveFailedMessage(err));
    } finally {
      setContinueBusy(false);
    }
  }
  const [country, setCountry]   = useState({
    iso2: 'AE',
    name: 'United Arab Emirates',
    emoji: '🇦🇪',
  });
  // GPS coordinates captured when the user completes onboarding — used to
  // sort match results by proximity on HomeScreen.
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  // Coords detected on the CountryScreen — passed straight to CityScreen
  // so the city is pre-selected without a second location tap.
  const [locationCoords, setLocationCoords] = useState<Coords | null>(null);
  // "X of Y" counter shown next to "Today's introduction"
  const [introductionIndex, setIntroductionIndex] = useState(1);
  const [totalIntroductions, setTotalIntroductions] = useState<number | null>(null);
  // True until the first successful introduction fetch — used to fetch with a
  // higher limit once so we know the total count for the day.
  const isFirstIntroLoad = useRef(true);

  // Persist localWardProposals to AsyncStorage so they survive app restarts.
  // Once the backend returns these from GET /wali/ward-proposals, they are
  // pruned from local state and this key will be empty.
  useEffect(() => {
    if (localWardProposals.length === 0) {
      AsyncStorage.removeItem(WALI_LOCAL_PROPOSALS_KEY).catch(() => {});
    } else {
      AsyncStorage.setItem(WALI_LOCAL_PROPOSALS_KEY, JSON.stringify(localWardProposals)).catch(() => {});
    }
  }, [localWardProposals]);

  const captureAndStoreLocation = useCallback(async () => {
    const coords = await captureCurrentLocation();
    if (coords) setUserCoords(coords);
  }, []);

  /**
   * Fetch wali-specific profile from GET /wali/me — the dedicated wali endpoint.
   * Populates wali name and full dependent (ward) details from a single call.
   * Throws on network / auth errors so callers can handle session loss.
   * For fire-and-forget call sites, wrap with .catch(() => {}).
   */
  async function loadWaliProfile() {
    const [me, intros, proposals, receivedProposals, convItems] = await Promise.all([
      getWaliMe(),
      getWardIntroductions().catch(() => []),
      getWardProposals().catch(() => []),
      getWardReceivedProposals().catch(() => []),
      listConversations().catch(() => []),
    ]);
    if (me.fullName) setUserName(me.fullName.split(' ')[0]);
    if (me.ward) {
      if (me.ward.fullName) setDependentName(me.ward.fullName);
      setDependentPhotos(
        (me.ward.photos ?? []).map(p => ({ ...p, url: resolvePhotoUrl(p.url) ?? p.url })),
      );
      setDependentMembershipId(me.ward.membershipId ?? '');
      setDependentProfile(me.ward);
    }
    setWardIntroductions(intros);
    setWardProposals(proposals);
    // Prune any local proposals the server now confirms (backend fix landed).
    setLocalWardProposals(prev =>
      prev.filter(p => !proposals.some(s => s.toUserId === p.toUserId)),
    );
    setWardReceivedProposals(receivedProposals);
    if (convItems.length > 0) setChats(mapChatItems(convItems));
  }

  const [introductionsLoading, setIntroductionsLoading] = useState(false);

  // Load (or reload) today's next introduction and update card state.
  // The first call fetches a batch to record the total for the "X of Y" label;
  // subsequent calls fetch 1 at a time.
  //
  // The batch is MAX_DISCOVER_LIMIT, not an arbitrary 50: the server rejects
  // anything above 30 outright, so asking for more returned a 400 and no
  // introductions at all rather than simply fewer.
  const loadNextIntroduction = useCallback((): Promise<void> => {
    setIntroductionsLoading(true);
    const limit = isFirstIntroLoad.current ? MAX_DISCOVER_LIMIT : 1;
    return getIntroductions(limit)
      .then(list => {
        if (isFirstIntroLoad.current) {
          setTotalIntroductions(list.length);
          isFirstIntroLoad.current = false;
        }
        if (list.length === 0) {
          setHasIntroductions(false);
          setCurrentIntroductionId(null);
          setIntroductionProfile(undefined);
          return;
        }
        const intro: Introduction = list[0];
        setCurrentIntroductionId(intro.userId);
        setHasIntroductions(true);
        // Slim list response — only home-card fields are available here.
        // Full profile fields are fetched separately in onViewProfile.
        setIntroductionProfile({
          userId: intro.userId,
          displayName: intro.fullName,
          age: intro.age,
          city: intro.city,
          latitude: intro.latitude,
          longitude: intro.longitude,
          occupation: intro.occupation,
          educationLevel: intro.educationLevel,
          blurPhotos: intro.blurPhotos,
          hideDistance: intro.hideDistance,
          distanceKm: intro.distanceKm,
          heightCm: intro.heightCm,
          maritalStatus: intro.maritalStatus,
          familyType: intro.familyType,
          bio: intro.bio,
          sect: intro.sect,
          madhhab: intro.madhhab,
          religiosity: intro.religiosity,
          idVerified: intro.idVerified,
          waliRegistered: intro.waliRegistered,
        });
      })
      .catch(() => {
        // Network failure — keep whatever state was already set.
      })
      .finally(() => setIntroductionsLoading(false));
  }, []);

  // ── Home paid/unpaid state ──────────────────────────────────────────────────
  // Which HomeScreen block applies:
  //   isEntitled = true  → H16: paid, show today's introductions
  //   isEntitled = false, candidateCount > 0 → H12: candidates waiting, prompt to pay
  //   isEntitled = false, candidateCount = 0 → H8: profile under review, no pool yet
  //
  // Called on launch AND every time Home comes back into view, so a payment
  // made moments ago flips the screen without restarting the app.

  // H9 (paid, ID review still running) is decided by the payment flow, not by
  // the server. A ref, so refreshHomeState() can read it without re-creating
  // itself on every change and re-firing the effects that depend on it.
  const underReviewPaidRef = useRef(false);
  useEffect(() => { underReviewPaidRef.current = underReviewPaid; }, [underReviewPaid]);

  const refreshHomeState = useCallback(async (isInitial = false) => {
    try {
      const { isEntitled } = await getEntitlement();
      if (isEntitled) {
        // Paid: nothing that prompts for payment may stay on screen.
        setUnderReviewUnpaid(false);
        setProposalsReadyUnpaid(false);
        setPaymentFailed(false);
        // Don't overwrite H9 — a paid user whose ID is still being reviewed
        // stays there until review clears, not on the introductions card.
        if (!underReviewPaidRef.current) setIntroductionAvailable(true);
      } else {
        const { candidateCount } = await getProposalStats();
        if (candidateCount > 0) {
          setProposalsReadyUnpaid(true);
          setMatchCount(candidateCount);
        } else {
          setUnderReviewUnpaid(true);
        }
      }
    } catch {
      // On launch there is no prior state to keep, so fall back to H8 (under
      // review). On a refresh, a network blip must not demote a paid user —
      // leave whatever is on screen alone.
      if (isInitial) setUnderReviewUnpaid(true);
    }
  }, []);

  // Re-check entitlement each time Home is shown (returning from F17/F18, or
  // from any other screen) and when the app returns to the foreground.
  useEffect(() => {
    if (screen !== 'Home' || isWali || !userId) return;
    refreshHomeState();
  }, [screen, isWali, userId, refreshHomeState]);

  useEffect(() => {
    if (isWali || !userId) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refreshHomeState();
    });
    return () => sub.remove();
  }, [isWali, userId, refreshHomeState]);

  // Trigger initial load when the user reaches H16 (paid + active).
  useEffect(() => {
    if (!introductionAvailable) return;
    loadNextIntroduction();
    getHomeStats()
      .then(stats => {
        setMatchCriteria(stats.matchCriteria);
        setReviewedThisWeek(stats.reviewedThisWeek);
      })
      .catch(() => { /* keep default zeros on network failure */ });
  }, [introductionAvailable, loadNextIntroduction]);

  // Reload introductions and stats when active filters change (manual filters or saved preferences).
  // Resets the feed so results reflect the new criteria from the start.
  useEffect(() => {
    if (!introductionAvailable) return;
    isFirstIntroLoad.current = true;
    setIntroductionIndex(1);
    setTotalIntroductions(null);
    loadNextIntroduction();
    getHomeStats()
      .then(stats => {
        setMatchCriteria(stats.matchCriteria);
        setReviewedThisWeek(stats.reviewedThisWeek);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, preferenceFilters]);

  // Re-fetch stats whenever the server signals a change via Supabase Realtime.
  useHomeSocket(userId, () => {
    if (!introductionAvailable) return;
    getHomeStats()
      .then(stats => {
        setMatchCriteria(stats.matchCriteria);
        setReviewedThisWeek(stats.reviewedThisWeek);
      })
      .catch(() => {});
  });

  // Wali: re-fetch ward proposals whenever any proposal changes (sent, withdrawn, stage change).
  useProposalsSocket(userId, () => {
    if (!isWali) return;
    loadWaliProfile().catch(() => {});
  });

  // ── shared chat list mapper (newest message on top) ─────────────────────────
  const mapChatItems = useCallback((items: ChatListItem[]) => {
    const mapped = items.map(c => ({
      id: c.id,
      matchId: c.matchId,
      name: c.partnerName,
      age: c.partnerAge,
      lastMessage: c.lastMessage ?? '',
      lastMessageAt: c.lastMessageAt ?? new Date().toISOString(),
      lastMessageSenderId: c.lastMessageSenderId,
      myUserId: userId,
      participantCount: c.participantCount,
      unreadCount: c.unreadCount,
    }));
    // Sort by latest message descending
    mapped.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    return mapped;
  }, [userId]);

  // Real-time refresh — fires when any conversation in the backend gets a new message.
  // This is the ONLY mechanism that updates the chat list after initial load.
  useChatListSocket(userId, () => {
    listConversations()
      .then(items => setChats(mapChatItems(items)))
      .catch(() => {});
  });

  // Initial load — only fetch when the list is empty (first time Chats screen is opened).
  // After that, useChatListSocket keeps it up to date in real-time.
  // We do NOT refetch every time screen === 'Chats' to avoid the reload flash when
  // coming back from a chat thread.
  useEffect(() => {
    if (screen !== 'Chats' || chats.length > 0) return;
    setChatsLoading(true);
    listConversations()
      .then(items => setChats(mapChatItems(items)))
      .catch(() => {})
      .finally(() => setChatsLoading(false));
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wali: load conversations when the conversations tab is opened.
  // Uses the same chats state as the seeker flow so ChatThread can resolve titles.
  useEffect(() => {
    if (!isWali || activeTab !== 'chats') return;
    listConversations()
      .then(items => setChats(mapChatItems(items)))
      .catch(() => {});
  }, [isWali, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Session restore — only call /auth/me if a token is actually stored.
  // Skipping the request when there is no token avoids a noisy 401 on
  // every fresh install / logged-out launch.
  useEffect(() => {
    Promise.all([getAccessToken(), getPendingEmail(), getPendingPhone()]).then(([token, pending, pendingPhone]) => {
      if (pending) {
        setPendingEmail(pending);
        if (pendingPhone) setPhoneE164(pendingPhone);
        setScreen('AccountVerification');
        setAppReady(true);
        return;
      }
      if (!token) { setAppReady(true); return; }

      getMe()
        .then(async me => {
          setUserId(me.user.id);
          setUserName(me.profile.fullName?.split(' ')[0] ?? '');

          // Restore role — wali users have a separate flow.
          // Check the DB role OR the onboarding step (wali steps are never user steps).
          const WALI_STEPS = ['WaliRole', 'WaliDetails', 'WaliComplete'];
          const savedStep = screenForStep(me.profile.onboardingStep);
          const isWaliSession = me.user.role?.toLowerCase() === 'wali' ||
            (savedStep != null && WALI_STEPS.includes(savedStep));
          applyRole(isWaliSession ? 'wali' : 'self');
          if (isWaliSession) {
            if (me.user.email) setUserEmail(me.user.email);
            // Restore locally-persisted proposals before loadWaliProfile runs,
            // so the prune logic inside it correctly removes any the server now confirms.
            try {
              const saved = await AsyncStorage.getItem(WALI_LOCAL_PROPOSALS_KEY);
              if (saved) {
                const parsed: WardProposal[] = JSON.parse(saved);
                if (parsed.length > 0) setLocalWardProposals(parsed);
              }
            } catch {}
            setWaliLoading(true);
            loadWaliProfile().catch(() => {}).finally(() => setWaliLoading(false));
            const step = savedStep as Screen | undefined;
            const waliNameMissing = !me.profile.fullName;
            if (me.profile.onboardingCompleted || (step === 'WaliComplete' && !waliNameMissing)) {
              // Fully done — go straight to Home.
              setOnboardingComplete(true);
              setScreen('Home');
            } else if (step === 'WaliDetails' || (step === 'WaliComplete' && waliNameMissing)) {
              // Name still missing — re-show WaliDetails to collect it.
              setScreen('WaliDetails');
            } else {
              // WaliRole saved or no step yet — must accept the role first.
              setScreen('WaliRole');
            }
            return;
          }

          // If the user has an email but hasn't verified it yet, redirect to
          // AccountVerification regardless of onboarding progress.
          const needsEmailVerification = me.user.email && !me.user.emailVerified;
          const needsPhoneVerification = me.profile.phone && !me.user.phoneVerified;
          if (needsEmailVerification || needsPhoneVerification) {
            if (me.user.email) setUserEmail(me.user.email);
            if (me.profile.phone) setPhoneE164(me.profile.phone);
            setPendingEmail(me.user.email || '');
            await savePendingEmail(me.user.email || '');
            setScreen('AccountVerification');
            return;
          }

          if (me.profile.onboardingCompleted) {
            setOnboardingComplete(true);
            await refreshHomeState(true);
            setScreen('Home');
          } else if (me.profile.onboardingStep) {
            const dest = destinationForSavedStep(me.profile.onboardingStep);
            if (dest.resumeAt) setResumeScreen(dest.resumeAt);
            if (dest.kind === 'complete') {
              setOnboardingComplete(true);
              await refreshHomeState(true);
              setScreen('Home');
            } else if (dest.kind === 'resume' && dest.resumeAt) {
              setScreen(dest.resumeAt);
            } else {
              setScreen('Home');
            }
          } else {
            // No saved step — fresh user, Home shows H6.
            setScreen('Home');
          }
        })
        .catch(() => {
          // JWT invalid and refresh failed — clear any stale tokens so the
          // user is fully logged out. Screen stays at F1 (no Home/H6 shown).
          clearTokens();
        })
        .finally(() => setAppReady(true));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track navigation direction for slide animation
  const directionRef = useRef<'forward' | 'back'>('forward');

  /**
   * Screens a back press should never return past.
   *
   * Reaching either means the journey that led here is over — signing out lands
   * on F1, finishing onboarding lands on Home — so the stack is cleared and a
   * further back press exits, which is what Android users expect at a root.
   */
  const ROOT_SCREENS: Screen[] = ['F1', 'Home'];

  /**
   * Screens that only exist before there is an account: the welcome page, both
   * sign-in steps, and every signup/verification step for a seeker or a wali.
   *
   * Once signed in they are unreachable by back. The session is already
   * created, so the forms there would either fail or create a second account,
   * and a signed-in user seeing "Sign in" again reads as being logged out.
   * Leaving the app is the only way past them — signing out is the supported
   * route back, and it navigates to F1 explicitly.
   */
  const PRE_AUTH_SCREENS: Screen[] = [
    'F1', 'SignInRole', 'SignIn', 'WhoIsFor', 'Phone', 'AccountVerification', 'Code',
    'WaliAccountSetup', 'WaliWelcome', 'WaliCode', 'WaliEmailVerify',
  ];

  /**
   * Whether a session exists, as a ref so the back handler reads the current
   * value rather than the one captured when it was registered.
   * `userId` is set from /auth/me (restore, sign-in, verification) and cleared
   * on sign-out.
   */
  const authedRef = useRef(false);
  useEffect(() => { authedRef.current = !!userId; }, [userId]);

  /** Drops trailing entries the user can no longer return to. */
  function prunePreAuth(stack: Screen[]): Screen[] {
    if (!authedRef.current) return stack;
    return stack.filter(sc => !PRE_AUTH_SCREENS.includes(sc));
  }

  /**
   * Screens visited, oldest first, so the hardware back button has somewhere to
   * return to.
   *
   * The app drives navigation from a single `screen` state rather than a
   * navigator, so nothing was consuming Android's back press and it fell
   * through to the OS — which closed the app from wherever you were. Opening
   * Filters and pressing back quit outright.
   */
  const historyRef = useRef<Screen[]>([]);

  /**
   * `reset` clears the back stack, making `to` a root.
   *
   * Used where returning would take the user somewhere they can no longer act —
   * after signing in, back must not lead to the sign-in form they have already
   * passed through.
   */
  function navigate(to: Screen, opts?: { reset?: boolean }) {
    if (to === screen) return;
    directionRef.current = navDirection(screen, to);
    historyRef.current =
      opts?.reset || ROOT_SCREENS.includes(to)
        ? []
        : prunePreAuth([...historyRef.current, screen]);
    setScreen(to);
  }

  /**
   * Android hardware and gesture back.
   *
   * Returning true consumes the press; returning false hands it to the OS,
   * which closes the app. Only a root screen with an empty stack should do
   * that. On Home the tab bar is the top level, so back returns to the Home tab
   * before it will consider exiting — the same shape as a bottom-tab navigator.
   */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'Home' && activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return goBack();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, activeTab]);

  /**
   * Pops one entry. False when there is nowhere left to go, which hands the
   * press to Android and closes the app.
   *
   * Signed in, the stack is pruned first: a session created mid-onboarding
   * left the signup screens sitting underneath, so back walked from F6 all the
   * way out to the welcome screen. Now that only exits the app.
   */
  function goBack(): boolean {
    const stack = prunePreAuth(historyRef.current);
    const prev = stack[stack.length - 1];
    if (prev === undefined) {
      historyRef.current = [];
      return false;
    }
    historyRef.current = stack.slice(0, -1);
    directionRef.current = 'back';
    setScreen(prev);
    return true;
  }

  /**
   * Forward onboarding navigation.
   *
   * The screen changes first and the step is recorded in the background. It used
   * to be the other way round — `await saveOnboardingStep(...)` and only then
   * `setScreen` — which held the user on the old screen watching a spinner for a
   * whole network round trip on every Continue. Against a hosted API that is the
   * difference between an app that responds instantly and one that feels stuck.
   *
   * Nothing here depends on the write landing: the step only decides where a
   * reinstall resumes, and a failed save simply leaves the previous value, which
   * is why the old code already swallowed the error and navigated anyway. So the
   * wait bought nothing and cost every transition.
   */
  function navigateForward(to: Screen) {
    directionRef.current = 'forward';
    historyRef.current = ROOT_SCREENS.includes(to)
      ? []
      : [...historyRef.current, screen];
    setScreen(to);

    const shouldSave =
      SCREEN_ORDER.includes(to) &&
      to !== 'F1' && to !== 'SignIn' && to !== 'Code' && to !== 'AccountVerification';
    const stepNumber = stepNumberFor(to);
    if (shouldSave && stepNumber != null) {
      // Optimistic: resume should point at where the user actually is, even if
      // the write is still in flight or fails.
      setResumeScreen(to);
      saveOnboardingStep(stepNumber).catch(() => {});
    }
  }

  // Maps onboarding sect string → filter sect array
  function sectToFilter(s: string): string[] {
    if (!s) return ['Any'];
    if (s === 'Shia') return ['Shia'];
    if (s === 'Ismaili') return ['Ismaili'];
    if (s === 'Other') return ['Any'];
    return ['Sunni'];
  }

  // Filters derived from onboarding answers — used as defaults before the user
  // explicitly applies their own filters via AdjustFiltersScreen.
  const onboardingFilters: FilterValues = {
    ageMin: obAgeMin,
    ageMax: obAgeMax,
    heightMinCm: null,
    heightMaxCm: null,
    cities: obCity ? [obCity] : ['Lahore'],
    includeOverseas: false,
    sects: sectToFilter(obSect),
    madhhabs: ['Any'],
    minReligiosity: 'Any',
    educationLevels: ['Any'],
    maritalStatuses: obMarital ? [obMarital] : ['Any'],
    acceptsChildren: false,
  };

  // Always reflects the active filter priority chain: manual > preferences > onboarding.
  // Written every render (ref write = no re-render) so loadNextIntroduction never stales.
  const activeFiltersRef = useRef<IntroductionFilters>(onboardingFilters);
  activeFiltersRef.current = appliedFilters ?? preferenceFilters ?? onboardingFilters;

  function renderScreen(): React.ReactNode {
    switch (screen) {

      // ── F1: Welcome ──────────────────────────────────────────────────────────
      case 'F1':
        return (
          <WelcomeScreen
            onContinue={() => navigate('WhoIsFor')}
            onSignIn={() => navigate('SignInRole')}
          />
        );

      case 'SignInRole':
        return (
          <SignInRoleScreen
            onBack={() => navigate('F1')}
            onContinue={role => { setSelectedRole(role); navigate('SignIn'); }}
          />
        );

      // ── SignIn ────────────────────────────────────────────────────────────────
      case 'SignIn':
        return (
          <SignInScreen
            onBack={() => navigate('SignInRole')}
            isWali={selectedRole === 'wali'}
            onSignIn={(_email, _password, emailVerified, _loginRole) => {
              // If email is not verified, redirect to AccountVerification immediately.
              if (!emailVerified && _email) {
                setUserEmail(_email);
                setPendingEmail(_email);
                savePendingEmail(_email).catch(() => {});
                // Reset: they are signed in now. Back must not return to the
                // sign-in form, nor anywhere further up the signup flow.
                navigate('AccountVerification', { reset: true });
                return;
              }
              // login() already saved tokens; check onboarding status
              getMe()
                .then(me => {
                  setUserId(me.user.id);
                  setUserName(me.profile.fullName?.split(' ')[0] ?? '');

                  // Wali users have a separate flow — route to the right step.
                  // Check role from /auth/me or from the login response directly.
                  const isWaliUser = me.user.role?.toLowerCase() === 'wali' || _loginRole?.toLowerCase() === 'wali';
                  applyRole(isWaliUser ? 'wali' : 'self');
                  if (isWaliUser) {
                    if (me.user.email) setUserEmail(me.user.email);
                    setWaliLoading(true);
                    loadWaliProfile().catch(() => {}).finally(() => setWaliLoading(false));
                    const step = screenForStep(me.profile.onboardingStep) as Screen | undefined;
                    const waliNameMissing = !me.profile.fullName;
                    if (me.profile.onboardingCompleted || (step === 'WaliComplete' && !waliNameMissing)) {
                      setOnboardingComplete(true);
                      navigate('Home');
                    } else if (step === 'WaliDetails' || (step === 'WaliComplete' && waliNameMissing)) {
                      navigate('WaliDetails');
                    } else {
                      navigate('WaliRole');
                    }
                    return;
                  }

                  if (me.profile.onboardingCompleted) {
                    setOnboardingComplete(true);
                    setIntroductionAvailable(true);
                    setHasIntroductions(true);
                    navigate('Home');
                  } else if (me.profile.onboardingStep) {
                    const dest = destinationForSavedStep(me.profile.onboardingStep);
                    if (dest.resumeAt) setResumeScreen(dest.resumeAt);
                    if (dest.kind === 'complete') {
                      setOnboardingComplete(true);
                      setIntroductionAvailable(true);
                      setHasIntroductions(true);
                      navigate('Home');
                    } else if (dest.kind === 'resume' && dest.resumeAt) {
                      navigate(dest.resumeAt);
                    } else {
                      navigate('Home');
                    }
                  } else {
                    navigate('Home');
                  }
                })
                .catch(() => {
                  // Fallback — token saved, go to home
                  setOnboardingComplete(true);
                  setIntroductionAvailable(true);
                  setHasIntroductions(true);
                  navigate('Home');
                });
            }}
            onGoogleSignIn={() => console.log('Google sign-in')}
            onCreateAccount={() => navigate('Phone')}
          />
        );

      // ── Phone ─────────────────────────────────────────────────────────────────
      case 'Phone':
        return (
          <PhoneScreen
            onBack={() => navigate('WhoIsFor')}
            onSendCode={(ph, dialCode, email, password, e164) => {
              setPhone(`${dialCode} ${ph}`);
              setPhoneE164(e164);
              setUserEmail(email);
              setUserPassword(password);
              setPendingEmail(email);
              savePendingPhone(e164);
              navigate('AccountVerification');
            }}
            onGoogleSignIn={() => console.log('Google sign-in')}
          />
        );

      // ── AccountVerification ───────────────────────────────────────────────────
      case 'AccountVerification':
        return (
          <AccountVerificationScreen
            phone={phoneE164 || phone}
            phoneDisplay={phone}
            email={pendingEmail || userEmail}
            onVerified={() => {
              setPendingEmail('');
              // Returned, not fired-and-forgotten: the screen awaits it to keep
              // the Continue button spinning until this resolves and navigates.
              // After verification, determine where to resume based on the user's state.
              return getMe()
                .then(me => {
                  setUserId(me.user.id);
                  setUserName(me.profile.fullName?.split(' ')[0] ?? '');
                  if (me.profile.onboardingCompleted) {
                    setOnboardingComplete(true);
                    setIntroductionAvailable(true);
                    setHasIntroductions(true);
                    navigate('Home');
                  } else if (me.profile.onboardingStep) {
                    const dest = destinationForSavedStep(me.profile.onboardingStep);
                    if (dest.resumeAt) setResumeScreen(dest.resumeAt);
                    if (dest.kind === 'complete') {
                      setOnboardingComplete(true);
                      setIntroductionAvailable(true);
                      setHasIntroductions(true);
                      navigate('Home');
                    } else if (dest.kind === 'resume' && dest.resumeAt) {
                      navigate(dest.resumeAt);
                    } else {
                      navigate('Home');
                    }
                  } else {
                    // Fresh user — start onboarding
                    navigateForward('F6');
                  }
                })
                .catch(() => navigateForward('F6'));
            }}
            onBack={() => navigate('Phone')}
          />
        );

      // ── Code (F4 + F19 error state) ───────────────────────────────────────────
      case 'Code':
        return (
          <CodeScreen
            phoneNumber={phone}
            email={userEmail}
            onBack={() => navigate('Phone')}
            onChangeNumber={() => navigate('Phone')}
            onVerify={_code => navigateForward('F6')}
          />
        );

      // ── WhoIsFor ──────────────────────────────────────────────────────────────
      case 'WhoIsFor':
        return (
          <WhoIsForScreen
            onBack={() => navigate('F1')}
            onContinue={(selection) => {
              applyRole(selection);
              navigate(selection === 'wali' ? 'WaliAccountSetup' : 'Phone');
            }}
          />
        );

      // ── Wali onboarding ───────────────────────────────────────────────────────
      case 'WaliAccountSetup':
        return (
          <WaliAccountSetupScreen
            onBack={() => navigate('WhoIsFor')}
            onContinue={(email, password) => {
              setWaliEmail(email);
              setWaliPassword(password);
              setWaliCodeError(undefined);
              navigate('WaliCode');
            }}
          />
        );

      // WaliWelcome — only reached via deep link (invitation URL), never from manual flow
      case 'WaliWelcome':
        return (
          <WaliWelcomeScreen
            dependentName="your dependent"
            onContinue={() => navigate('WaliAccountSetup')}
            onLearnMore={() => navigate('WaliRole')}
          />
        );

      case 'WaliCode':
        return (
          <WaliCodeEntryScreen
            onBack={() => { setWaliCodeError(undefined); navigate('WaliAccountSetup'); }}
            loading={waliCodeLoading}
            error={waliCodeError}
            onVerify={async code => {
              setWaliCodeError(undefined);
              setWaliCodeLoading(true);
              try {
                // fullName is required by RedeemParentInviteDto. The real name is
                // collected on WaliDetails and overwrites this via updateWaliDetails;
                // sending the address local-part keeps the account creatable until then.
                const provisionalName = waliEmail.split('@')[0] || 'Wali';
                const result = await verifyInviteCode(code, {
                  email: waliEmail,
                  password: waliPassword,
                  fullName: provisionalName,
                });

                // Email confirmation on: no session yet, the code is in their
                // inbox. Confirmation off: signed in already, skip the step.
                if (isPendingConfirmation(result)) {
                  setWaliCodeSent(true);   // redeem's own signUp already sent it
                  setWaliEmailError(undefined);
                  navigate('WaliEmailVerify');
                  return;
                }

                applyServerRole(result.user.role);
                // Load wali-specific profile in background via dedicated endpoint
                loadWaliProfile().catch(() => {});
                navigate('WaliRole');
              } catch (e: any) {
                // The server validates the invite before it creates anything —
                // every check in ParentInviteRedemptionService runs ahead of the
                // Supabase signUp, so reaching this branch means no account was
                // made and the code is the thing to fix. Map its actual answer
                // rather than collapsing everything into "something went wrong".
                const status: number | undefined = e?.status;
                const msg: string = (e?.message ?? '').toLowerCase();
                setWaliCodeError(
                  status === 404 || msg.includes('not found')
                    ? 'We could not find that code. Check each character and try again.'
                    : msg.includes('expired')
                      ? 'This code has expired. Ask your dependent to send a new one.'
                      : msg.includes('no longer valid')
                        ? 'This code has already been used.'
                        : status === 403 || msg.includes('different email')
                          ? 'This invite was sent to a different email address. Go back and use that one.'
                          : msg.includes('already registered')
                            ? 'An account already exists for this email. Sign in instead.'
                            : msg.includes('letters or digits')
                              ? 'That code does not look right — six letters or digits.'
                              : 'Could not create your account. Please try again.',
                );
              } finally {
                setWaliCodeLoading(false);
              }
            }}
          />
        );

      case 'WaliEmailVerify':
        return (
          <WaliEmailVerifyScreen
            email={waliEmail}
            codeSent={waliCodeSent}
            sending={waliEmailSending}
            verifying={waliEmailVerifying}
            error={waliEmailError}
            onBack={() => { setWaliEmailError(undefined); navigate('WaliCode'); }}
            onChangeEmail={() => {
              // The identity is tied to the address that was redeemed, so a
              // correction means going back and redeeming again.
              setWaliCodeSent(false);
              setWaliEmailError(undefined);
              navigate('WaliAccountSetup');
            }}
            onSendCode={async () => {
              setWaliEmailError(undefined);
              setWaliEmailSending(true);
              try {
                await resendEmailOtp(waliEmail);
                setWaliCodeSent(true);
              } catch (e: any) {
                const msg: string = (e?.message ?? '').toLowerCase();
                setWaliEmailError(
                  msg.includes('rate') || msg.includes('many') || msg.includes('429')
                    ? 'Too many requests. Please wait a minute and try again.'
                    : 'Could not send the code. Please try again.',
                );
              } finally {
                setWaliEmailSending(false);
              }
            }}
            onVerify={async code => {
              setWaliEmailError(undefined);
              setWaliEmailVerifying(true);
              try {
                const result = await verifyEmailOtp(waliEmail, code);
                applyServerRole(result.user.role);
                setUserId(result.user.id);
                if (result.user.email) setUserEmail(result.user.email);
                setWaliCodeSent(false);
                loadWaliProfile().catch(() => {});
                navigate('WaliRole');
              } catch (e: any) {
                const msg: string = (e?.message ?? '').toLowerCase();
                // The server answers a wrong code and an expired one with the
                // same message on purpose, so the copy must not claim to know
                // which it was — telling someone their code expired when they
                // simply mistyped sends them to resend for no reason.
                setWaliEmailError(
                  msg.includes('invalid') || msg.includes('expired') || msg.includes('code')
                    ? 'That code did not work. Check it, or send yourself a new one.'
                    : 'Could not verify the code. Please try again.',
                );
              } finally {
                setWaliEmailVerifying(false);
              }
            }}
          />
        );

      case 'WaliRole':
        return (
          <WaliRoleExplainScreen
            onBack={() => navigate('WaliCode')}
            onAccept={() => {
              // Recorded in the background, as everywhere else: the step only
              // decides where a reinstall resumes, so awaiting it just froze the
              // button for a round trip.
              saveOnboardingStep(ONBOARDING_STEP.WaliDetails).catch(() => {});
              navigate('WaliDetails');
            }}
            onDecline={() => navigate('WhoIsFor')}
          />
        );

      case 'WaliDetails':
        return (
          <WaliDetailsScreen
            dependentName={dependentName || undefined}
            onBack={() => navigate('WaliRole')}
            saving={waliDetailsSaving}
            error={waliDetailsError}
            onContinue={async (name, relationship) => {
              setWaliDetailsError(undefined);
              setWaliDetailsSaving(true);
              try {
                // One call: the name families see, and his kinship to the ward.
                await updateWaliDetails({
                  fullName: name.trim(),
                  kinship: toKinship(relationship),
                });
                setUserName(name.trim().split(' ')[0]);
                saveOnboardingStep(ONBOARDING_STEP.WaliComplete).catch(() => {});
                navigate('WaliComplete');
              } catch {
                // Kept on the screen: silently moving on would leave the
                // placeholder name from redeem showing to families.
                setWaliDetailsError('Could not save your details. Please try again.');
              } finally {
                setWaliDetailsSaving(false);
              }
            }}
          />
        );

      case 'WaliComplete':
        return (
          <WaliSetupCompleteScreen
            onGoHome={() => { setOnboardingComplete(true); navigate('Home'); }}
            onSeeDependent={() => { setOnboardingComplete(true); navigate('Home'); }}
          />
        );

      // ── F6: Country ───────────────────────────────────────────────────────────
      case 'F6':
        return (
          <CountryScreen
            onBack={() => navigate('WhoIsFor')}
            onSave={() => console.log('Save')}
            onLocationDetected={coords => setLocationCoords(coords)}
            onContinue={c => {
              setCountry(c);
              navigateForward('F7');
            }}
            continueLoading={continueBusy}
          />
        );

      // ── F7: City ──────────────────────────────────────────────────────────────
      case 'F7':
        return (
          <CityScreen
            countryCode={country.iso2}
            countryName={country.name}
            initialCoords={locationCoords ?? undefined}
            onBack={() => navigate('F6')}
            onSave={() => console.log('Save')}
            onContinue={(city, coords) => {
              setObCity(city);
              if (coords?.latitude != null && coords?.longitude != null) {
                updateLocation(coords.latitude, coords.longitude).catch(() => {});
              }
              navigateForward('F8');
            }}
            continueLoading={continueBusy}
          />
        );

      // ── F8: Essentials ────────────────────────────────────────────────────────
      case 'F8':
        return (
          <EssentialsScreen
            onBack={() => navigate('F7')}
            onContinue={data => {
              setObSect(data.sect);
              setObMarital(data.maritalStatus);
              setUserName(data.name.split(' ')[0]);
              saveThenAdvance(async () => {
                await updateEssentials({
                  gender: toGender(data.gender as 'man' | 'woman'),
                  dateOfBirth: parseDob(data.dob),
                  maritalStatus: toMaritalStatus(data.maritalStatus),
                  countryCode: country.iso2,
                  ...(obCity ? { city: obCity } : {}),
                  occupation: data.occupation,
                  educationLevel: data.educationLevel,
                  heightCm: data.heightCm,
                });
                await updateSect(toSect(data.sect));
              }, 'F10');
            }}
            continueLoading={continueBusy}
          />
        );

      // ── F10: Progress Hub ─────────────────────────────────────────────────────
      case 'F10':
        return (
          <ProgressHubScreen
            onBack={() => navigate('F8')}
            onSave={() => console.log('Save')}
            onContinue={() => navigateForward('F11')}
            continueLoading={continueBusy}
          />
        );

      // ── F11: Family & Home ────────────────────────────────────────────────────
      case 'F11':
        return (
          <FamilyAndHomeScreen
            onBack={() => navigate('F10')}
            onSave={() => console.log('Save')}
            onContinue={data => saveThenAdvance(() => updateFamilyBackground(data), 'F12')}
            continueLoading={continueBusy}
          />
        );

      // ── F12: Guided Prompt ────────────────────────────────────────────────────
      case 'F12':
        return (
          <GuidedPromptScreen
            onBack={() => navigate('F11')}
            onSave={() => console.log('Save')}
            onNext={text => saveThenAdvance(() => updatePrompts({ familyDescription: text }), 'F13')}
            questionIndex={1}
            totalQuestions={3}
            progress={0.72}
            continueLoading={continueBusy}
          />
        );

      // ── F13: Preferences ─────────────────────────────────────────────────────
      case 'F13':
        return (
          <PreferencesScreen
            onContinue={({ narrow, ageMin, ageMax }) => {
              setObAgeMin(ageMin);
              setObAgeMax(ageMax);
              saveThenAdvance(
                () => updatePreferences(ageMin, ageMax),
                narrow ? 'H11' : 'F14',
              );
            }}
            onSave={() => console.log('Save')}
            continueLoading={continueBusy}
          />
        );

      // ── F14: Photos ───────────────────────────────────────────────────────────
      case 'F14':
        return (
          <PhotosScreen
            onBack={() => navigate('F13')}
            onContinue={() => navigateForward('F16')}
            continueLoading={continueBusy}
          />
        );

      // ── F15: Wali Invite ──────────────────────────────────────────────────────
      case 'F15':
        // Helper: advance the saved step to F16 in the background so that
        // on next app restart F15 is not shown again (it was already seen).
        const advancePastWali = () => {
          const n = stepNumberFor('F16');
          if (n != null) saveOnboardingStep(n).catch(() => {});
          setResumeScreen('F16');
        };
        return (
          <WaliInviteScreen
            onBack={() => navigate('F14')}
            onLater={() => { advancePastWali(); navigate('F16'); }}
            onInviteWhatsApp={() => {
              advancePastWali();
              navigate('F16');
            }}
            onReadCode={() => {
              advancePastWali();
              navigate('F16');
            }}
            onSkip={() => {
              advancePastWali();
              navigate('F16');
            }}
          />
        );

      // ── F16: Verification ─────────────────────────────────────────────────────
      case 'F16':
        return (
          <VerificationScreen
            faceDone={faceDone}
            cnicDone={cnicDone}
            faceFailed={faceFailed}
            cnicFailed={cnicFailed}
            faceAttemptsLeft={faceAttemptsLeft}
            onBack={() => navigate('F15')}
            onScanFace={() => {
              // Simulate: first tap fails; sets H3 state
              if (!faceDone && !faceFailed) {
                setFaceAttempts(prev => Math.max(1, prev - 1));
                setFaceFailed(true);
              }
            }}
            onAddId={() => {
              // Simulate: first tap fails; sets H4 state
              if (!cnicDone && !cnicFailed) {
                setCnicFailed(true);
              }
            }}
            onDismissFailed={() => {
              // Back from H3/H4 → return to normal F16 view
              setFaceFailed(false);
              setCnicFailed(false);
            }}
            onRetryFace={() => {
              // Retry succeeds (demo)
              setFaceFailed(false);
              setFaceDone(true);
            }}
            onUploadCnic={() => {
              // Upload succeeds (demo)
              setCnicFailed(false);
              setCnicDone(true);
            }}
            onContinue={() => {
              // Save F17 to DB so F16 is never re-shown on restart
              // (handles both "Continue" and "Skip for now" paths).
              const n = stepNumberFor('F17');
              if (n != null) saveOnboardingStep(n).catch(() => {});
              setResumeScreen('F17');
              setVerificationSubmittedAt(new Date());
              navigate('F17');
            }}
          />
        );

      // ── F17: Payment ──────────────────────────────────────────────────────────
      case 'F17':
        return (
          <PaymentScreen
            paying={paying}
            onBack={() => navigate('F16')}
            onPay={async () => {
              setPaying(true);
              try {
                // The store token. There is no Play Billing bridge in JS yet
                // (no react-native-iap / RevenueCat in package.json), so a real
                // receipt does not exist to send. Posting '' is a guaranteed 400
                // — purchaseToken is @IsNotEmpty server-side — so dev builds send
                // a unique sandbox token the StubBillingVerifier accepts, and
                // release builds fail the payment instead of sending a fake one.
                // Replace this with the token from the IAP purchase result.
                const purchaseToken = __DEV__
                  ? `sandbox-${userId || 'anon'}-${Date.now()}`
                  : '';
                const result = await verifyPurchase(
                  purchaseToken,
                  MEMBERSHIP_PRODUCT_ID,
                  PLATFORM_PURCHASE_SOURCE,
                );
                if (result.isEntitled) {
                  setPaymentFailed(false);
                  setUnderReviewPaid(true);
                  const n = stepNumberFor('F18');
                  if (n != null) saveOnboardingStep(n).catch(() => {});
                  navigate('F18');
                } else {
                  setPaymentFailed(true);
                  navigate('Home');
                }
              } catch {
                setPaymentFailed(true);
                navigate('Home');
              } finally {
                setPaying(false);
              }
            }}
            onSkip={() => {
              // User verified but skipped payment → H8 (under review, unpaid)
              setUnderReviewUnpaid(true);
              const n = stepNumberFor('F18');
              if (n != null) saveOnboardingStep(n).catch(() => {});
              navigate('F18');
            }}
            onWhatDoIGet={() => console.log('What do I get?')}
          />
        );

      // ── F18: Done ─────────────────────────────────────────────────────────────
      case 'F18':
        return (
          <DoneScreen
            waliName={waliName}
            onRemindWali={() => console.log('Remind wali')}
            onGoHome={() => {
              captureAndStoreLocation();
              setOnboardingComplete(true);
              navigate('Home');
            }}
          />
        );



      // ── H11: Fine-tune search ─────────────────────────────────────────────────
      // Opened from F13 (onboarding) or from the Home filter icon.
      case 'H11':
        return (
          <NarrowCriteriaScreen
            userName={userName}
            filters={appliedFilters ?? preferenceFilters ?? onboardingFilters}
            onWidenCriteria={() => navigate('Filters')}
            onKeepCriteria={() => {
              const dest = h11FromHome ? 'Home' : 'F14';
              setH11FromHome(false);
              navigate(dest);
            }}
          />
        );

      // ── Filters: Adjust search filters ────────────────────────────────────────
      case 'Filters': {
        return (
          <AdjustFiltersScreen
            initialFilters={appliedFilters ?? preferenceFilters ?? onboardingFilters}
            onBack={() => {
              if (h11FromHome) {
                setH11FromHome(false);
                navigate('Home');
              } else {
                navigate('H11');
              }
            }}
            onApply={(filters) => {
              setAppliedFilters(filters);
              setH11FromHome(false);
              navigate('Home');
            }}
          />
        );
      }

      // ── F21: No matches ───────────────────────────────────────────────────────
      case 'F21':
        return (
          <NoMatchScreen
            city="Multan"
            familyCount={40}
            onFinishBiodata={() => navigate('F11')}
            onSearchNearby={() => console.log('Search nearby')}
          />
        );

      // ── F22: Returning user ───────────────────────────────────────────────────
      case 'F22':
        return (
          <ReturningScreen
            onContinue={() => navigate('F11')}
          />
        );

      // ── Home ─────────────────────────────────────────────────────────────────
      case 'Home':
        if (isWali) {
          return (
            <WaliHomeScreen
              waliName={userName}
              dependentName={dependentName}
              loading={waliLoading}
              proposalCount={0}
              proposal={null}
              activeTab={activeTab === 'home' ? 'review' : activeTab === 'proposals' ? 'proposals' : activeTab === 'chats' ? 'conversations' : 'family'}
              onTabChange={tab => {
                if (tab === 'review') setActiveTab('home');
                else if (tab === 'proposals') setActiveTab('proposals');
                else if (tab === 'conversations') setActiveTab('chats');
                else setActiveTab('family');
              }}
              onOpenSettings={() => navigate('Settings')}
              onRefresh={async () => {
                const token = await getAccessToken().catch(() => null);
                if (!token) {
                  applyRole('self');
                  setDependentName('');
                  setDependentProfile(null);
                  setDependentPhotos([]);
                  setDependentMembershipId('');
                  navigate('F1');
                  return;
                }
                // Use the dedicated wali endpoint — not the shared /auth/me
                await loadWaliProfile().catch(async () => {
                  const stillHasToken = await getAccessToken().catch(() => null);
                  if (!stillHasToken) {
                    applyRole('self');
                    setDependentName('');
                    setDependentProfile(null);
                    navigate('F1');
                  }
                });
              }}
              wardIntroductions={wardIntroductions.filter(i => {
                const proposedIds = new Set([
                  ...localWardProposals.map(p => p.toUserId),
                  ...wardProposals.map(p => p.toUserId),
                ]);
                return !proposedIds.has(i.userId);
              })}
              wardProposals={[
                ...localWardProposals.filter(l => !wardProposals.some(s => s.toUserId === l.toUserId)),
                ...wardProposals,
              ]}
              wardReceivedProposals={wardReceivedProposals}
              onViewIntroProfile={async (userId) => {
                setViewingDependent(false);
                setDetailProfile(undefined);
                setDetailLoading(true);
                navigate('ProfileDetail');
                getIntroduction(userId)
                  .then((intro: FullIntroduction) => {
                    setDetailProfile({
                      userId: intro.userId,
                      displayName: intro.fullName,
                      age: intro.age,
                      city: intro.city,
                      latitude: intro.latitude,
                      longitude: intro.longitude,
                      occupation: intro.occupation,
                      educationLevel: intro.educationLevel,
                      fieldOfStudy: intro.fieldOfStudy,
                      employmentStatus: intro.employmentStatus,
                      languagesSpoken: intro.languagesSpoken,
                      bio: intro.bio,
                      photoUrl: intro.photoUrl,
                      photoUrls: intro.photoUrls,
                      blurPhotos: intro.blurPhotos,
                      hideDistance: intro.hideDistance,
                      distanceKm: intro.distanceKm,
                      gender: intro.gender,
                      heightCm: intro.heightCm,
                      maritalStatus: intro.maritalStatus,
                      hasChildren: intro.hasChildren,
                      willingToRelocate: intro.willingToRelocate,
                      sect: intro.sect,
                      madhhab: intro.madhhab,
                      religiosity: intro.religiosity,
                      prayerFrequency: intro.prayerFrequency,
                      wearsHijab: intro.wearsHijab,
                      keepsBeard: intro.keepsBeard,
                      halalStrict: intro.halalStrict,
                      quranMemorization: intro.quranMemorization,
                      familyType: intro.familyType,
                      housingStatus: intro.housingStatus,
                      livingArrangement: intro.livingArrangement,
                      fatherOccupation: intro.fatherOccupation,
                      motherOccupation: intro.motherOccupation,
                      siblingsSummary: intro.siblingsSummary,
                      hasVehicle: intro.hasVehicle,
                      idVerified: intro.idVerified,
                      waliRegistered: intro.waliRegistered,
                      countryCode: intro.countryCode,
                    });
                  })
                  .finally(() => setDetailLoading(false));
              }}
              onIntroNotSuitable={async (userId) => {
                // Remove immediately so the card disappears without waiting for the server
                setWardIntroductions(prev => prev.filter(i => i.userId !== userId));
                await skipIntroduction(userId).catch(() => {});
                const intros = await getWardIntroductions().catch(() => null);
                if (intros !== null) setWardIntroductions(intros);
              }}
              onIntroSendProposal={async (userId, note) => {
                const intro = wardIntroductions.find(i => i.userId === userId);
                const optimistic: WardProposal = {
                  id: `optimistic-${userId}`,
                  toUserId: userId,
                  recipientName: intro?.fullName ?? null,
                  recipientAge: intro?.age ?? null,
                  recipientCity: intro?.city ?? null,
                  recipientOccupation: intro?.occupation ?? null,
                  // Optimistic placeholder; the server returns the real stage on refresh.
                  stage: 'HIS_WALI_PENDING',
                  createdAt: new Date().toISOString(),
                };
                // Wait for the API before removing from intro feed — keeps the
                // modal mounted with its loader visible while the request is in-flight.
                await sendWardProposal(userId, note).catch(() => {});
                // Optimistic updates — socket's proposals:stale will trigger
                // loadWaliProfile() which refreshes all feeds and prunes localWardProposals.
                setWardIntroductions(prev => prev.filter(i => i.userId !== userId));
                setLocalWardProposals(prev => [optimistic, ...prev.filter(p => p.toUserId !== userId)]);
              }}
              dependentProfile={dependentProfile ? {
                membershipId: dependentProfile.membershipId,
                fullName: dependentProfile.fullName ?? undefined,
                age: dependentProfile.age ?? undefined,
                city: dependentProfile.city ?? undefined,
                sect: dependentProfile.sect ?? undefined,
                educationLevel: dependentProfile.educationLevel ?? undefined,
                occupation: dependentProfile.occupation ?? undefined,
                bio: dependentProfile.bio ?? undefined,
                onboardingComplete: dependentProfile.onboardingCompleted,
                idVerified: dependentProfile.idVerified,
                memberSince: dependentProfile.memberSince,
                photos: dependentPhotos,
              } : undefined}
              onRemoveDependent={async (membershipId) => {
                await removeWard(membershipId);
                setDependentName('');
                setDependentProfile(null);
                setDependentPhotos([]);
                setDependentMembershipId('');
              }}
              onViewDependentProfile={() => {
                if (!dependentProfile) return;
                setViewingDependent(true);
                setDetailProfile({
                  userId: dependentProfile.userId,
                  displayName: dependentProfile.fullName ?? '',
                  age: dependentProfile.age ?? 0,
                  city: dependentProfile.city ?? '',
                  occupation: dependentProfile.occupation ?? null,
                  educationLevel: dependentProfile.educationLevel ?? null,
                  fieldOfStudy: dependentProfile.fieldOfStudy ?? null,
                  employmentStatus: dependentProfile.employmentStatus ?? null,
                  languagesSpoken: dependentProfile.languagesSpoken ?? [],
                  bio: dependentProfile.bio ?? null,
                  photoUrl: dependentPhotos[0]?.url ?? null,
                  photoUrls: dependentPhotos.map(p => p.url),
                  blurPhotos: false,
                  idVerified: dependentProfile.idVerified,
                  gender: dependentProfile.gender ?? null,
                  heightCm: dependentProfile.heightCm ?? null,
                  maritalStatus: dependentProfile.maritalStatus ?? null,
                  hasChildren: dependentProfile.hasChildren ?? null,
                  willingToRelocate: dependentProfile.willingToRelocate ?? null,
                  countryCode: dependentProfile.countryCode ?? null,
                  sect: dependentProfile.sect ?? null,
                  madhhab: dependentProfile.madhhab ?? null,
                  religiosity: dependentProfile.religiosityLevel ?? null,
                  prayerFrequency: dependentProfile.prayerFrequency ?? null,
                  wearsHijab: dependentProfile.wearsHijab ?? null,
                  keepsBeard: dependentProfile.keepsBeard ?? null,
                  halalStrict: dependentProfile.halalStrict ?? null,
                  quranMemorization: dependentProfile.quranMemorization ?? null,
                  familyType: dependentProfile.familyType ?? null,
                  housingStatus: dependentProfile.housingStatus ?? null,
                  livingArrangement: dependentProfile.livingArrangement ?? null,
                  fatherOccupation: dependentProfile.fatherOccupation ?? null,
                  motherOccupation: dependentProfile.motherOccupation ?? null,
                  siblingsSummary: dependentProfile.siblingsSummary ?? null,
                  hasVehicle: dependentProfile.hasVehicle ?? null,
                });
                setDetailLoading(false);
                navigate('ProfileDetail');
              }}
              conversations={chats.map((c): WaliConversation => ({
                id: c.id,
                participantName: c.name,
                lastMessage: c.lastMessage,
                lastMessageAt: c.lastMessageAt,
                unread: (c.unreadCount ?? 0) > 0,
              }))}
              onOpenConversation={(chatId) => {
                setActiveChatId(chatId);
                navigate('ChatThread');
              }}
            />
          );
        }
        return (
          <HomeScreen
            userName={userName}
            paymentFailed={paymentFailed}
            faceFailed={faceFailed}
            cnicFailed={cnicFailed}
            faceAttemptsLeft={faceAttemptsLeft}
            underReviewUnpaid={underReviewUnpaid}
            underReviewPaid={underReviewPaid}
            proposalsReadyUnpaid={proposalsReadyUnpaid}
            matchCount={matchCount}
            introductionAvailable={introductionAvailable}
            hasIntroductions={hasIntroductions}
            introductionCity={introductionCity}
            introductionProfile={introductionProfile}
            matchCriteria={matchCriteria}
            reviewedThisWeek={reviewedThisWeek}
            introductionIndex={introductionIndex}
            totalIntroductions={totalIntroductions ?? undefined}
            userCoords={userCoords ?? undefined}
            profileIncomplete={!isWali && !onboardingComplete}
            resumeScreen={resumeScreen}
            onNotSuitable={() => {
              if (!currentIntroductionId) return;
              skipIntroduction(currentIntroductionId).catch(() => {});
              setMatchCriteria(c => Math.max(0, c - 1));
              setIntroductionIndex(i => i + 1);
              loadNextIntroduction();
            }}
            onProposalWithdrawn={() => {
              // Interest record deleted → person re-enters discovery pool.
              // Reload the introduction card so the home feed reflects the change.
              loadNextIntroduction().catch(() => {});
            }}
            onViewProposalProfile={(userId, type, matchId) => {
              setViewingDependent(false);
              setDetailProfile(undefined);
              setDetailLoading(true);
              setProfileMatchId(matchId);
              // Determine context: if matchId is set → matched, else use type
              const ctx: ProposalContext = matchId
                ? (type === 'sent' ? 'sent_matched' : 'received_matched')
                : (type === 'sent' ? 'sent_pending' : 'received_pending');
              setProfileProposalContext(ctx);
              navigate('ProfileDetail');
              getIntroduction(userId)
                .then((intro: FullIntroduction) => {
                  setDetailProfile({
                    userId: intro.userId,
                    displayName: intro.fullName,
                    age: intro.age,
                    city: intro.city,
                    latitude: intro.latitude,
                    longitude: intro.longitude,
                    occupation: intro.occupation,
                    educationLevel: intro.educationLevel,
                    fieldOfStudy: intro.fieldOfStudy,
                    employmentStatus: intro.employmentStatus,
                    languagesSpoken: intro.languagesSpoken,
                    bio: intro.bio,
                    photoUrl: intro.photoUrl,
                    photoUrls: intro.photoUrls,
                    blurPhotos: intro.blurPhotos,
                    hideDistance: intro.hideDistance,
                    distanceKm: intro.distanceKm,
                    gender: intro.gender,
                    heightCm: intro.heightCm,
                    maritalStatus: intro.maritalStatus,
                    hasChildren: intro.hasChildren,
                    willingToRelocate: intro.willingToRelocate,
                    sect: intro.sect,
                    madhhab: intro.madhhab,
                    religiosity: intro.religiosity,
                    prayerFrequency: intro.prayerFrequency,
                    wearsHijab: intro.wearsHijab,
                    keepsBeard: intro.keepsBeard,
                    halalStrict: intro.halalStrict,
                    quranMemorization: intro.quranMemorization,
                    familyType: intro.familyType,
                    housingStatus: intro.housingStatus,
                    livingArrangement: intro.livingArrangement,
                    fatherOccupation: intro.fatherOccupation,
                    motherOccupation: intro.motherOccupation,
                    siblingsSummary: intro.siblingsSummary,
                    hasVehicle: intro.hasVehicle,
                    idVerified: intro.idVerified,
                    waliRegistered: intro.waliRegistered,
                    countryCode: intro.countryCode,
                  });
                })
                .finally(() => setDetailLoading(false));
            }}
            onViewProfile={() => {
              if (!currentIntroductionId) return;
              setViewingDependent(false);
              setDetailProfile(undefined);
              setDetailLoading(true);
              setProfileProposalContext('none');
              setProfileMatchId(null);
              navigate('ProfileDetail');
              getIntroduction(currentIntroductionId)
                .then((intro: FullIntroduction) => {
                  setDetailProfile({
                    userId: intro.userId,
                    displayName: intro.fullName,
                    age: intro.age,
                    city: intro.city,
                    latitude: intro.latitude,
                    longitude: intro.longitude,
                    occupation: intro.occupation,
                    educationLevel: intro.educationLevel,
                    fieldOfStudy: intro.fieldOfStudy,
                    employmentStatus: intro.employmentStatus,
                    languagesSpoken: intro.languagesSpoken,
                    bio: intro.bio,
                    photoUrl: intro.photoUrl,
                    photoUrls: intro.photoUrls,
                    blurPhotos: intro.blurPhotos,
                    hideDistance: intro.hideDistance,
                    distanceKm: intro.distanceKm,
                    gender: intro.gender,
                    heightCm: intro.heightCm,
                    maritalStatus: intro.maritalStatus,
                    hasChildren: intro.hasChildren,
                    willingToRelocate: intro.willingToRelocate,
                    sect: intro.sect,
                    madhhab: intro.madhhab,
                    religiosity: intro.religiosity,
                    prayerFrequency: intro.prayerFrequency,
                    wearsHijab: intro.wearsHijab,
                    keepsBeard: intro.keepsBeard,
                    halalStrict: intro.halalStrict,
                    quranMemorization: intro.quranMemorization,
                    familyType: intro.familyType,
                    housingStatus: intro.housingStatus,
                    livingArrangement: intro.livingArrangement,
                    fatherOccupation: intro.fatherOccupation,
                    motherOccupation: intro.motherOccupation,
                    siblingsSummary: intro.siblingsSummary,
                    hasVehicle: intro.hasVehicle,
                    idVerified: intro.idVerified,
                    waliRegistered: intro.waliRegistered,
                    countryCode: intro.countryCode,
                  });
                })
                .finally(() => setDetailLoading(false));
              // stats:stale socket event will trigger the refresh automatically
            }}
            onSendProposal={async (note) => {
              if (!currentIntroductionId) return;
              await sendProposal(currentIntroductionId, note).catch(() => {});
              setMatchCriteria(c => Math.max(0, c - 1));
              setIntroductionIndex(i => i + 1);
              setProposalsRefreshKey(k => k + 1);
              loadNextIntroduction();
            }}
            onChangeCity={() => { setH11FromHome(true); navigate('Filters'); }}
            onAdjustFilters={() => { setH11FromHome(true); navigate('Filters'); }}
            onOpenSettings={() => navigate('Settings')}
            waliState="unresponsive"
            onAskWaliAgain={() => console.log('Ask wali again')}
            onChooseAnotherWali={() => navigate('F15')}
            onRemindWali={() => console.log('Remind wali')}
            onChangeWali={() => navigate('F15')}
            onReviewProposal={() => console.log('Review proposal')}
            onSwitchToProfile={() => setActiveTab('home')}
            onRefresh={async () => {
              await Promise.all([
                loadNextIntroduction(),
                getHomeStats()
                  .then(stats => {
                    setMatchCriteria(stats.matchCriteria);
                    setReviewedThisWeek(stats.reviewedThisWeek);
                  })
                  .catch(() => {}),
              ]);
            }}
            onRetryPayment={() => {
              // Retry → go back to payment screen; success handled there
              setPaymentFailed(false);
              navigate('F17');
            }}
            onChangePaymentMethod={() => {
              setPaymentFailed(false);
              navigate('F17');
            }}
            onRetryFace={() => {
              // Take user back to F16 so they can actually redo the face scan
              setFaceFailed(false);
              navigate('F16');
            }}
            onUploadCnic={() => {
              // Take user back to F16 so they can re-upload their CNIC
              setCnicFailed(false);
              navigate('F16');
            }}
            onContinueOnboarding={() => navigate(resumeScreen)}
            onBecomeAMember={() => {
              setUnderReviewUnpaid(false);
              setProposalsReadyUnpaid(false);
              navigate('F17');
            }}
            onConfirmWali={() => navigate('F15')}
            onImproveBiodata={() => navigate('F8')}
            onReviewPreferences={() => navigate('F13')}
            verificationSubmittedAt={verificationSubmittedAt}
            onOpenFilters={() => {
              setH11FromHome(true);
              navigate('H11');
            }}
            introductionsLoading={introductionsLoading}
            activeTab={activeTab}
            onTabChange={tab => {
              if (tab === 'chats') navigate('Chats');
              else setActiveTab(tab);
            }}
            proposalsBadge={proposalsBadge}
            proposalsRefreshKey={proposalsRefreshKey}
            onProposalsBadgeChange={setProposalsBadge}
          />
        );

      // ── ProfileDetail: P2 ─────────────────────────────────────────────────
      case 'ProfileDetail':
        return (
          <ProfileDetailScreen
            profile={detailProfile}
            loading={detailLoading}
            isWaliView={isWali}
            isDependent={viewingDependent}
            proposalContext={profileProposalContext}
            onBack={() => { setViewingDependent(false); setProfileProposalContext('none'); setProfileMatchId(null); navigate('Home'); }}
            onNotSuitable={() => { setProfileProposalContext('none'); navigate('Home'); }}
            onRequestPhoto={() => console.log('Request photo')}
            onSendProposal={() => console.log('Send proposal')}
            onWithdrawProposal={() => { setProfileProposalContext('none'); navigate('Home'); }}
            onAcceptProposal={() => { setProfileProposalContext('none'); navigate('Home'); }}
            onDeclineProposal={() => { setProfileProposalContext('none'); navigate('Home'); }}
            onOpenChat={() => {
              if (profileMatchId) {
                // Find the conversation for this match
                const chat = chats.find(c => c.matchId === profileMatchId);
                if (chat) {
                  setActiveChatId(chat.id);
                  setProfileProposalContext('none');
                  setProfileMatchId(null);
                  navigate('ChatThread');
                  return;
                }
              }
              setProfileProposalContext('none');
              setProfileMatchId(null);
              navigate('Chats');
            }}
          />
        );

      // ── Chats: CH1 / CH2 ─────────────────────────────────────────────────
      case 'Chats':
        return (
          <ChatsListScreen
            chats={chats}
            loading={chatsLoading}
            onOpenChat={(chatId) => {
              setActiveChatId(chatId);
              navigate('ChatThread');
            }}
            onSeeProposals={() => { setActiveTab('proposals'); navigate('Home'); }}
            onBack={() => navigate('Home')}
          />
        );

      // ── Chat thread: CH3 ──────────────────────────────────────────────────
      case 'ChatThread': {
        const activeChat = chats.find(c => c.id === activeChatId);
        const chatTitle = activeChat
          ? `${activeChat.name}${activeChat.age != null ? ` · ${activeChat.age}` : ''}`
          : 'Chat';
        return (
          <ChatThreadScreen
            conversationId={activeChatId ?? ''}
            myUserId={userId}
            myDisplayName={userName}
            chatTitle={chatTitle}
            onBack={() => isWali ? navigate('Home') : navigate('Chats')}
            onMessageSent={(text) => {
              // Optimistically update the chat preview immediately — no waiting
              // for the Supabase chats:stale round-trip.
              setChats(prev => {
                const now = new Date().toISOString();
                const updated = prev.map(c =>
                  c.id === activeChatId
                    ? { ...c, lastMessage: text, lastMessageAt: now, lastMessageSenderId: userId }
                    : c,
                );
                updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
                return updated;
              });
            }}
          />
        );
      }

      // ── Settings: M1 ─────────────────────────────────────────────────────
      case 'Settings':
        if (isWali) {
          return (
            <WaliSettingsScreen
              waliName={userName}
              waliEmail={userEmail || undefined}
              dependentName={dependentName || undefined}
              onBack={() => navigate('Home')}
              onNotifications={() => navigate('Notifications')}
              onLanguage={() => navigate('Language')}
              onContactSupport={() => navigate('ContactSupport')}
              onPrivacyPolicy={() => navigate('PrivacyPolicy')}
              onTermsOfService={() => navigate('TermsOfService')}
              onSignOut={async () => {
                try { await logout(); } catch { await clearTokens(); }
                applyRole('self');
                setUserId('');
                setDependentName('');
                setDependentProfile(null);
                setDependentPhotos([]);
                setDependentMembershipId('');
                setWardIntroductions([]);
                setWardProposals([]);
                setLocalWardProposals([]);
                setWardReceivedProposals([]);
                setWaliLoading(false);
                navigate('F1');
              }}
              onDeleteAccount={() => navigate('DeleteAccount')}
            />
          );
        }
        return (
          <SettingsScreen
            userName={userName || 'Mian Haseeb'}
            userCity="Lahore"
            onBack={() => navigate('Home')}
            onViewBiodata={() => navigate('EditProfile')}
            onEdit={() => navigate('EditProfile')}
            onPartnerPreferences={() => navigate('PartnerPreferences')}
            onWali={() => navigate('YourWali')}
            onPrivacy={() => navigate('Privacy')}
            onMembership={() => navigate('Membership')}
            onNotifications={() => navigate('Notifications')}
            onLanguage={() => navigate('Language')}
            onBlockedPeople={() => navigate('BlockedPeople')}
            onContactSupport={() => navigate('ContactSupport')}
            onPrivacyPolicy={() => navigate('PrivacyPolicy')}
            onTermsOfService={() => navigate('TermsOfService')}
            onRefundPolicy={() => navigate('RefundPolicy')}
            onFoundMyMatch={() => navigate('FoundMyMatch')}
            onDownloadData={() => navigate('DownloadData')}
            onSignOut={async () => {
              try { await logout(); } catch { await clearTokens(); }
              applyRole('self');
              setUserId('');
              navigate('F1');
            }}
            onDeleteAccount={() => navigate('DeleteAccount')}
          />
        );

      // ── Privacy: M2 ──────────────────────────────────────────────────────
      case 'Privacy':
        return (
          <PrivacyScreen
            onBack={() => navigate('Settings')}
            onYourPhotos={() => navigate('YourPhotos')}
          />
        );

      // ── YourPhotos: M3 ───────────────────────────────────────────────────
      case 'YourPhotos':
        return (
          <YourPhotosScreen
            onBack={() => navigate('Privacy')}
            onAddPhoto={() => console.log('Add photo')}
          />
        );

      // ── Membership: M4 ───────────────────────────────────────────────────
      case 'Membership':
        return (
          <MembershipScreen
            onBack={() => navigate('Settings')}
            onEmailReceipt={() => console.log('Email receipt')}
            onRequestRefund={() => console.log('Request refund')}
            onReadRefundPolicy={() => console.log('Read refund policy')}
          />
        );

      // ── DeleteAccount: M5 ────────────────────────────────────────────────
      case 'DeleteAccount':
        return (
          <DeleteAccountScreen
            onBack={() => navigate('Settings')}
            onFoundMyMatch={() => { navigate('Home'); }}
            onKeepAccount={() => navigate('Settings')}
            onDeletePermanently={async () => {
              await clearTokens();
              navigate('F1');
            }}
          />
        );

      // ── EditProfile: M6 ──────────────────────────────────────────────────
      case 'EditProfile':
        return (
          <EditProfileScreen
            onBack={() => navigate('Settings')}
            onCancel={() => navigate('Settings')}
            onContinue={() => navigate('Settings')}
          />
        );

      // ── Notifications ─────────────────────────────────────────────────────
      case 'Notifications':
        return (
          <NotificationsScreen
            onBack={() => navigate('Settings')}
          />
        );

      // ── Language ──────────────────────────────────────────────────────────
      case 'Language':
        return (
          <LanguageScreen
            onBack={() => navigate('Settings')}
          />
        );

      // ── BlockedPeople ─────────────────────────────────────────────────────
      case 'BlockedPeople':
        return (
          <BlockedPeopleScreen
            onBack={() => navigate('Settings')}
          />
        );

      // ── ContactSupport ────────────────────────────────────────────────────
      case 'ContactSupport':
        return (
          <ContactSupportScreen
            onBack={() => navigate('Settings')}
          />
        );

      // ── Privacy Policy ────────────────────────────────────────────────────
      case 'PrivacyPolicy':
        return (
          <LegalScreen
            type="privacy"
            onBack={() => navigate('Settings')}
          />
        );

      // ── Terms of Service ──────────────────────────────────────────────────
      case 'TermsOfService':
        return (
          <LegalScreen
            type="terms"
            onBack={() => navigate('Settings')}
          />
        );

      // ── Refund Policy ─────────────────────────────────────────────────────
      case 'RefundPolicy':
        return (
          <LegalScreen
            type="refund"
            onBack={() => navigate('Settings')}
          />
        );

      // ── FoundMyMatch ──────────────────────────────────────────────────────
      case 'FoundMyMatch':
        return (
          <FoundMyMatchScreen
            onBack={() => navigate('Settings')}
            onConfirm={async () => {
              await clearTokens();
              navigate('F1');
            }}
          />
        );

      // ── DownloadData ──────────────────────────────────────────────────────
      case 'DownloadData':
        return (
          <DownloadDataScreen
            onBack={() => navigate('Settings')}
          />
        );

      // ── PartnerPreferences ────────────────────────────────────────────────
      case 'PartnerPreferences':
        return (
          <PartnerPreferencesScreen
            onBack={() => navigate('Settings')}
            initialAgeMin={obAgeMin}
            initialAgeMax={obAgeMax}
            initialSect={obSect}
            initialMaritalStatus={obMarital}
            onSave={(values) => {
              const { ageMin, ageMax, sects, maritalStatuses, heightMinCm, heightMaxCm, minReligiosity, educationLevels, cities, includeOverseas } = values;
              // Keep ob* vars in sync for onboarding defaults fallback
              setObAgeMin(ageMin);
              setObAgeMax(ageMax);
              setObSect(sects.includes('Any') ? '' : (sects[0] ?? ''));
              setObMarital(maritalStatuses.includes('Any') ? '' : (maritalStatuses[0] ?? ''));
              // Store full preferences so AdjustFiltersScreen inherits all fields as defaults
              setPreferenceFilters({ ageMin, ageMax, heightMinCm, heightMaxCm, cities, includeOverseas, sects, minReligiosity, educationLevels, maritalStatuses });
              // Clear any manually applied filters so saved preferences take over
              setAppliedFilters(undefined);
            }}
          />
        );

      case 'YourWali':
        return (
          <FamilyScreen
            waliState="unresponsive"
            onBack={() => navigate('Settings')}
            onRemindWali={() => console.log('Remind wali')}
            onChangeWali={() => navigate('F15')}
            onAskWaliAgain={() => console.log('Ask wali again')}
            onChooseAnotherWali={() => navigate('F15')}
            onReviewProposal={() => console.log('Review proposal')}
            onSwitchToProfile={() => navigate('Home')}
          />
        );

      default:
        return null;
    }
  }

  // Show a blank screen while the session-restore check runs
  if (!appReady) {
    return <SafeAreaProvider><View style={styles.root} /></SafeAreaProvider>;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <ScreenTransition key={screen} direction={directionRef.current}>
          {renderScreen()}
        </ScreenTransition>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
