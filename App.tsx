import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  BackHandler,
  Dimensions,
  Easing,
  Image,
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
  updatePendingContact,
  getPendingStatus,
  meansNoPendingSignup,
} from './src/api/auth';
import {
  submitFaceVerification,
  submitCnicVerification,
} from './src/api/verification';
import { LOGO_SOURCE } from './src/assets/logo';
import { INITIAL_SAFE_AREA_METRICS } from './src/lib/safeAreaMetrics';
import { resolvePhotoUrl } from './src/api/config';
import { getWaliMe, removeWard, getWardIntroductions, getWardDiscovery, getWardProposals, getWardReceivedProposals, sendWardProposal, updateWaliDetails, toKinship, approveProposal, declineProposal } from './src/api/wali';
import type { WardProposal, WardReceivedProposal } from './src/api/wali';
import {
  verifyPurchase,
  restorePurchase,
  MEMBERSHIP_PRODUCT_ID,
  STORE_PURCHASES_SUPPORTED,
} from './src/api/billing';
import { ApiError } from './src/api/client';
import {
  buyMembership,
  finishMembershipPurchase,
  getMembershipPrice,
  getUnfinishedPurchases,
  initIap,
  isAlreadyOwned,
  isStoreError,
  isUserCancelled,
  type StorePurchaseRecord,
} from './src/lib/iap';
import { getIntroductions, getIntroduction, getHomeStats, skipIntroduction, MAX_DISCOVER_LIMIT, type Introduction, type FullIntroduction, type IntroductionFilters } from './src/api/introductions';
import { sendProposal, acceptProposal, declineReceivedProposal } from './src/api/proposals';
import { getHomeState, hasSubmittedAllVerifications } from './src/api/home';
import {
  updateLocation,
  updateEssentials,
  updateSect,
  updateFamilyBackground,
  updatePreferences,
  getMyProfile,
  updatePrompts,
  updatePhotoPrivacy,
  toGender,
  toMaritalStatus,
  toSect,
  parseDob,
  getProfileCompletion,
  type ProfileCompletion,
} from './src/api/profile';
import { ONBOARDING_STEP, resumeFromOnboardingStep, screenForStep, stepNumberFor } from './src/onboarding/steps';
import { type IntroductionProfile } from './src/components/introduction/IntroductionAvailableBlock';
import { getAccessToken, getPendingEmail, getPendingPhone, savePendingEmail, savePendingPhone, clearPendingEmail, clearTokens } from './src/storage/authStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHomeRealtime } from './src/hooks/useHomeRealtime';

/**
 * Orders a chat list newest-first, treating "no messages yet" as oldest.
 *
 * Both sort sites did this inline with `new Date(x.lastMessageAt)`, which only
 * compiled because the field was typed as a plain string — the value could
 * always be absent, and the fallback that hid it stamped empty chats with the
 * current clock so they jumped to the top on every refresh.
 */
function byNewestMessage(
  a: { lastMessageAt: string | null },
  b: { lastMessageAt: string | null },
): number {
  const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
  const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
  return tb - ta;
}

/**
 * Sign out and drop every module-level screen cache.
 *
 * Those caches outlive the component tree, so without this a second account
 * signing in on the same device saw the previous user's proposals and their
 * name and email in Settings until the first fetch returned.
 *
 * One helper rather than the same two lines at four call sites — the caches
 * were already being missed at all four.
 */
async function signOutAndClearCaches(): Promise<void> {
  // Before `logout()`: unregistering is an authenticated call, and once the
  // tokens are gone the row cannot be removed — leaving this handset receiving
  // the previous user's proposals until FCM happens to rotate its token.
  await unregisterPushToken();
  try {
    await logout();
  } catch {
    await clearTokens();
  }
  resetProposalsCache();
  resetSettingsCache();
}

const WALI_LOCAL_PROPOSALS_KEY = '@mehram_wali_local_proposals';
import { useProposalsRealtime } from './src/hooks/useProposalsRealtime';
import { useChatListRealtime } from './src/hooks/useChatListRealtime';
import {
  registerPushToken,
  subscribeToForegroundMessages,
  subscribeToNotificationTaps,
  subscribeToTokenRefresh,
  unregisterPushToken,
  type PushData,
} from './src/lib/push';
import { useNotificationsRealtime } from './src/hooks/useNotificationsRealtime';
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
import { AdjustFiltersScreen, FilterValues, BASE_DEFAULTS } from './src/screens/home/AdjustFiltersScreen';
import { captureCurrentLocation, Coords } from './src/utils/location';
import { firstNameFrom, isPlaceholderName } from './src/utils/displayName';
import { ProfileDetailScreen, type ProposalContext } from './src/screens/profile/ProfileDetailScreen';
import { AccountVerificationScreen } from './src/screens/onboarding/AccountVerificationScreen';
import { SignInScreen } from './src/screens/onboarding/SignInScreen';
import { ForgotPasswordScreen } from './src/screens/onboarding/ForgotPasswordScreen';
import { SignInRoleScreen } from './src/screens/onboarding/SignInRoleScreen';
import { SettingsScreen, resetSettingsCache } from './src/screens/home/SettingsScreen';
import { PhotoRequestsScreen } from './src/screens/home/PhotoRequestsScreen';
import { NotificationFeedScreen } from './src/screens/home/NotificationFeedScreen';
import { requestPhoto, getIncomingPhotoRequests } from './src/api/photoRequests';
import { getUnreadNotificationCount } from './src/api/notifications';
import { requestRefund } from './src/api/billing';
import { signInWithGoogle as googleSignIn } from './src/lib/googleAuth';
import { resetProposalsCache } from './src/screens/home/ProposalsScreen';
import { FamilyScreen } from './src/screens/home/FamilyScreen';
import { PrivacyScreen } from './src/screens/home/PrivacyScreen';
import { YourPhotosScreen } from './src/screens/home/YourPhotosScreen';
import { MembershipScreen } from './src/screens/home/MembershipScreen';
import { EditProfileScreen } from './src/screens/profile/EditProfileScreen';
import { NotificationsScreen } from './src/screens/home/NotificationsScreen';
import { LanguageScreen } from './src/screens/home/LanguageScreen';
import { BlockedPeopleScreen } from './src/screens/home/BlockedPeopleScreen';
import { ContactSupportScreen } from './src/screens/home/ContactSupportScreen';
import { LegalScreen } from './src/screens/home/LegalScreen';
import { PartnerPreferencesScreen } from './src/screens/home/PartnerPreferencesScreen';
import type { PreferenceValues } from './src/components/preferences/PreferenceFields';
import {
  preferencesFromApi,
  preferencesToApi,
  withPreferenceDefaults,
} from './src/components/preferences/PreferenceFields';
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
  | 'F1' | 'SignInRole' | 'SignIn' | 'ForgotPassword' | 'WhoIsFor' | 'Phone' | 'AccountVerification' | 'Code'
  | 'F6' | 'F7' | 'F8' | 'F10'
  | 'F11' | 'F12' | 'F13' | 'F14' | 'F15' | 'F16' | 'F17' | 'F18'
  | 'F21' | 'F22' | 'H11' | 'Filters' | 'Home' | 'ProfileDetail'
  | 'Settings' | 'Privacy' | 'YourPhotos' | 'Membership' | 'EditProfile'
  | 'Notifications' | 'Language' | 'BlockedPeople' | 'ContactSupport'
  | 'PrivacyPolicy' | 'TermsOfService' | 'RefundPolicy'
  | 'PartnerPreferences' | 'YourWali'
  // Wali onboarding
  | 'WaliAccountSetup' | 'WaliWelcome' | 'WaliCode' | 'WaliEmailVerify' | 'WaliRole' | 'WaliDetails' | 'WaliComplete'
  // Chat
  | 'Chats' | 'ChatThread' | 'PhotoRequests' | 'NotificationFeed';

const SCREEN_ORDER: Screen[] = [
  // Onboarding
  'F1', 'SignInRole', 'SignIn', 'ForgotPassword', 'WhoIsFor',
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
  /**
   * Screens reachable from Home, deeper than it.
   *
   * These were absent, and `navDirection` treats an unknown screen as
   * 'forward' — so leaving a chat or a profile slid in from the right as if
   * the user were going deeper, while actually returning.
   *
   * Ordered by depth: the feed screens sit beside Home, a thread and a profile
   * open on top of the list that leads to them.
   */
  'Filters', 'H11', 'F21', 'F22',
  'Chats', 'ChatThread',
  'PhotoRequests', 'NotificationFeed',
  'ProfileDetail',
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
/**
 * `initialScreen` lets the web build open on a specific screen — the marketing
 * site's "Log in" and "Sign up" buttons land on the sign-in and create-account
 * role pickers rather than on the welcome carousel. Nothing passes it on iOS or
 * Android, where the app always starts at the beginning.
 */
export default function App({ initialScreen }: { initialScreen?: Screen } = {}) {
  const [screen, setScreen]     = useState<Screen>(initialScreen ?? 'F1');
  const [activeTab, setActiveTab] = useState<'home' | 'proposals' | 'chats' | 'family'>('home');
  const [phone, setPhone]           = useState('');
  const [phoneE164, setPhoneE164]   = useState('');
  const [userEmail, setUserEmail]   = useState('');
  const [userPassword, setUserPassword] = useState('');
  /**
   * Which field AccountVerification sent the user back to PhoneScreen to fix,
   * or null when PhoneScreen is being used to create an account.
   *
   * Held here rather than on either screen because it decides both how
   * PhoneScreen opens and where its back chevron returns to.
   */
  const [contactEdit, setContactEdit] = useState<null | 'phone' | 'email'>(null);
  /**
   * The number AccountVerification confirmed, if any. Kept above that screen so
   * a trip out to change the email does not throw the phone step away when the
   * number itself never changed.
   */
  const [verifiedPhoneE164, setVerifiedPhoneE164] = useState('');
  // Server's answer for the email, fetched when the verification screen shows.
  const [serverEmailVerified, setServerEmailVerified] = useState(false);
  // True while that fetch is in flight. Without it the rows render as
  // unverified first and snap to "Verified" when the answer lands, which reads
  // as the app losing a verification and then finding it again.
  const [verificationStatusLoading, setVerificationStatusLoading] = useState(false);
  /**
   * When the signup form registered, which is when the first email code went
   * out. The verification screen counts its resend window from this rather than
   * from the tap that opens the code boxes.
   */
  const [emailCodeSentAt, setEmailCodeSentAt] = useState<number | undefined>();
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
  // Shown on the paywall itself. Cancelling Play's sheet clears it rather than
  // setting it — backing out is not an error and must leave the screen as it was.
  const [payError, setPayError]             = useState<string | undefined>();
  // Refs, not state: the foreground restore pass reads these from inside an
  // AppState callback that closes over its first render, so a state value would
  // always be the stale one. Nothing renders from them.
  const payInFlight                         = useRef(false);
  const recoverInFlight                     = useRef(false);
  // Google's own localised price, e.g. "Rs 4,500.00". Null until fetched, and
  // stays null if Play is unreachable, so the paywall falls back to its static text.
  const [storePrice, setStorePrice]         = useState<string | null>(null);
  const [appReady, setAppReady]             = useState(false);
  // True when verification submitted but payment skipped → H8 shows on Home.
  const [underReviewUnpaid, setUnderReviewUnpaid] = useState(false);
  /**
   * Which card Home shows, as resolved by `refreshHomeState` — the sole writer
   * of these three.
   *
   * The payment screen used to set them optimistically, which is how Home came
   * to show "One step left — verify my identity" for a moment after a completed
   * payment, before the server's real answer replaced it. Anything that changes
   * what the answer *will be* now marks `homeStateLoaded` false and refetches
   * instead of predicting it.
   */
  // True when verified and paid but still under review → H9 shows on Home.
  const [underReviewPaid, setUnderReviewPaid] = useState(false);
  /**
   * Whether `refreshHomeState` has answered at least once for this user.
   *
   * Home's review / proposals / introduction states are all decided by that
   * response, but two of the flags are also set optimistically — the payment
   * screen flips `underReviewPaid` before anything is fetched. That put Home in
   * the review branch while `verificationPending` still held its `false`
   * default, so a user who had just finished verification and paid was told
   * "One step left — verify my identity" until the first fetch landed and
   * replaced it. Home now waits for the answer instead of guessing.
   */
  const [homeStateLoaded, setHomeStateLoaded] = useState(false);
  // True when verified, review passed, candidates available, but not yet paid → H12 shows on Home.
  const [proposalsReadyUnpaid, setProposalsReadyUnpaid] = useState(false);
  // True once the user is a paid member and introductions are ready → H16 shows on Home.
  const [introductionAvailable, setIntroductionAvailable] = useState(false);
  /**
   * Whether the feed actually has a card, as answered by `loadNextIntroduction`.
   *
   * Written there and nowhere else. `refreshHomeState` used to set it too, from a
   * count that ignores the session's filters, so a card could appear and then
   * vanish on the next refresh — see the note at that call site.
   */
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
  /** Prefills the recovery screen from whichever field the user had typed. */
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');

  const [proposalsBadge, setProposalsBadge] = useState(0);
  /**
   * Photo requests waiting on this user, from the home state.
   *
   * Kept apart from `proposalsBadge` rather than folded into it: that value is
   * owned by ProposalsScreen, and two writers for one number is how the home
   * flags went wrong earlier. They are summed once, at the render site.
   */
  const [photoRequestsBadge, setPhotoRequestsBadge] = useState(0);
  /** The same, for a guardian: requests their ward's mode makes theirs to answer. */
  const [waliPhotoRequestsBadge, setWaliPhotoRequestsBadge] = useState(0);
  /** Unread notifications, badged on the bell in the home top bar. */
  const [notificationsBadge, setNotificationsBadge] = useState(0);
  /** Result of a refund request, shown on the membership screen. */
  const [refundNotice, setRefundNotice] = useState<string | null>(null);
  /**
   * Why a Google attempt failed, shown on the screen that started it.
   *
   * Most likely cause early on is the provider not yet being enabled in the
   * Supabase dashboard — which the error text says, rather than the button
   * appearing to do nothing.
   */
  const [googleError, setGoogleError] = useState<string | null>(null);

  /**
   * Its own fetch rather than part of the home state.
   *
   * The count changes on things home state knows nothing about — a message, a
   * profile view — and the notifications module already serves it directly.
   */
  const refreshNotificationCount = useCallback(() => {
    getUnreadNotificationCount()
      .then(setNotificationsBadge)
      .catch(() => {});
  }, []);
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
  /**
   * When the wali's resend cooldown should count from, in epoch ms.
   *
   * Separate from `waliCodeSent` because that only ever goes false→true once: a
   * resend left it unchanged, so the screen had nothing to restart its cooldown
   * from and the link stayed tappable straight into the server's rate limit.
   */
  const [waliResendFrom, setWaliResendFrom]   = useState<number | undefined>();
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
  /**
   * Filters the wali has applied to their ward's introduction feed.
   *
   * Session-only, exactly like the seeker's `appliedFilters`: they narrow what
   * this guardian is shown and are never saved to the ward's stored preference.
   */
  const [wardFilters, setWardFilters] = useState<Partial<FilterValues> | undefined>(undefined);
  /** Read inside `loadWaliProfile`, which is not a hook and cannot close over state. */
  const wardFiltersRef = useRef<Partial<FilterValues> | undefined>(undefined);
  wardFiltersRef.current = wardFilters;
  /**
   * City name shown on the H16 empty state.
   *
   * Was a `useState('')` with no setter, so it never held anything and the copy
   * rendered "No profiles in  yet" — an empty string is not `undefined`, so the
   * component's own "your city" fallback never applied either. Filled from the
   * profile alongside the stored preferences.
   */
  const [introductionCity, setIntroductionCity] = useState('');
  // True once the user has completed F18 (DoneScreen) and gone home.
  // False = user authenticated but hasn't finished onboarding → H6 shows.
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  // Tracks whether H11 was opened from the Home filter icon (vs from onboarding F13).
  const [h11FromHome, setH11FromHome] = useState(false);
  // When the user submitted their verification — passed to UnderReviewUnpaidBlock for "Xh ago".
  const [verificationSubmittedAt, setVerificationSubmittedAt] = useState<Date | undefined>(undefined);
  /**
   * A verification is genuinely awaiting review, per the server.
   *
   * Distinct from the under-review *screen*, which also covers "not submitted"
   * and "rejected" — those share a card today but must not share its wording.
   */
  const [verificationPending, setVerificationPending] = useState(false);
  /**
   * The verification actually came back APPROVED.
   *
   * Distinct from `verificationPending`, which is also true for a submitted-but
   * -unreviewed profile: the settings screen's tick means "verified", so it
   * needs the narrower fact.
   */
  const [verificationApproved, setVerificationApproved] = useState(false);
  /** Whether the membership has been paid for, from the home state. */
  const [isPaidMember, setIsPaidMember] = useState(false);
  /** Some verification types submitted, but not the full required set. */
  const [verificationPartial, setVerificationPartial] = useState(false);
  /** The server reports the profile itself is under 100% complete. */
  const [serverProfileIncomplete, setServerProfileIncomplete] = useState(false);
  /** Verified and paid, but no wali linked — not discoverable, cannot propose. */
  const [waliRequired, setWaliRequired] = useState(false);
  /**
   * Which profile sections the server considers finished.
   *
   * H6 needs this rather than `resumeScreen`: that marker sits past every
   * profile section once verification or payment has been reached, so it read
   * an incomplete profile as done and the card rendered nothing.
   */
  const [profileCompletion, setProfileCompletion] = useState<
    ProfileCompletion | undefined
  >(undefined);
  /**
   * The section report is being fetched.
   *
   * `profileCompletion === undefined` cannot carry this on its own: it is also
   * what a failed request leaves behind, and the two need opposite treatment —
   * wait for the first, fall back to `resumeScreen` for the second.
   */
  const [profileCompletionLoading, setProfileCompletionLoading] = useState(false);
  /** Address the verification status has already been fetched for, so a
   *  refetch does not put the rows back behind a skeleton. */
  const loadedStatusForRef = useRef('');
  /**
   * F16 was opened from the home screen rather than reached during onboarding.
   *
   * It changes both ends of the screen: there is no earlier step to go back to
   * (the one behind it is already done), and finishing must return Home rather
   * than continue into payment, which this user has already passed.
   */
  const [verifyFromHome, setVerifyFromHome] = useState(false);
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
  /**
   * Which introduction load is the current one.
   *
   * Two effects used to call `loadNextIntroduction` — one on reaching H16, one
   * on a filter change — so two requests could be in flight at once, racing on
   * the mutable `isFirstIntroLoad` ref. Whichever response happened to win that
   * check wrote `totalIntroductions`, which is how a card appeared above "1 of
   * 0": one request set the total from an empty list, the other set the card.
   */
  const introLoadSeq = useRef(0);

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
    // `me` first: the ward's discovery feed is keyed on their user id, which is
    // only known once this resolves.
    const me = await getWaliMe();
    const wardId = me.ward?.userId;
    const filters = wardFiltersRef.current;
    const [intros, proposals, receivedProposals, convItems, photoReqs] = await Promise.all([
      // With no filter applied, the existing matches endpoint. With one, the
      // ward's discovery pool — the only feed the server can narrow.
      wardId && filters
        ? getWardDiscovery(wardId, MAX_DISCOVER_LIMIT, filters).catch(() => [])
        : getWardIntroductions().catch(() => []),
      getWardProposals().catch(() => []),
      getWardReceivedProposals().catch(() => []),
      listConversations().catch(() => []),
      // A guardian answers their ward's photo requests under two of the three
      // privacy modes, so their badge has to count them too. The server marks
      // each row with whether *this* reader may act.
      getIncomingPhotoRequests().catch(() => []),
    ]);
    setWaliPhotoRequestsBadge(photoReqs.filter(r => r.canAnswer).length);

    if (me.fullName) setUserName(me.fullName.split(' ')[0]);
    if (me.ward) {
      // The filter screen opens on the ward's own criteria. Seeded only while
      // the guardian has not applied a filter of their own this session —
      // overwriting that would silently undo what they just chose.
      if (!wardFiltersRef.current && me.ward.partnerPreference) {
        setWardFilters(
          withPreferenceDefaults(preferencesFromApi(me.ward.partnerPreference)),
        );
      }
      // A ward who has not set a real name yet has the registration
      // placeholder derived from their email; that is not a name to show.
      if (me.ward.fullName && !isPlaceholderName(me.ward.fullName, me.ward.email)) {
        setDependentName(me.ward.fullName);
      }
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
    // Both decided here rather than read back after the await: a ref read in the
    // continuation belongs to whichever load started most recently, not to this
    // one.
    const isBatch = isFirstIntroLoad.current;
    isFirstIntroLoad.current = false;
    const seq = ++introLoadSeq.current;
    const limit = isBatch ? MAX_DISCOVER_LIMIT : 1;
    // The active filters go with the request. Without them "Apply filters"
    // reloaded the feed and the server returned the identical pool, because it
    // was still filtering by the stored preference alone.
    return getIntroductions(limit, sessionFiltersRef.current)
      .then(list => {
        // A newer load has started, so this answer is already stale — writing
        // it would mix two different queries' results into one card.
        if (seq !== introLoadSeq.current) return;
        if (isBatch) {
          setTotalIntroductions(list.length);
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
          photosWithheld: intro.photosWithheld,
          hideDistance: intro.hideDistance,
          distanceKm: intro.distanceKm,
          heightCm: intro.heightCm,
          maritalStatus: intro.maritalStatus,
          familyType: intro.familyType,
          bio: intro.bio,
          sect: intro.sect,
          madhhab: intro.madhhab,
          religiosity: intro.religiosityLevel,
          idVerified: intro.idVerified,
          waliRegistered: intro.waliRegistered,
        });
      })
      .catch(() => {
        // Network failure — keep whatever state was already set.
      })
      .finally(() => {
        // Only the current load owns the spinner; a stale one finishing must not
        // clear it while the newer request is still running.
        if (seq === introLoadSeq.current) setIntroductionsLoading(false);
      });
  }, []);

  // ── Home paid/unpaid state ──────────────────────────────────────────────────
  // Which HomeScreen block applies:
  //   isEntitled = true  → H16: paid, show today's introductions
  //   isEntitled = false, candidateCount > 0 → H12: candidates waiting, prompt to pay
  //   isEntitled = false, candidateCount = 0 → H8: profile under review, no pool yet
  //
  // Called on launch AND every time Home comes back into view, so a payment
  // made moments ago flips the screen without restarting the app.

  /**
   * Ask the server which home state to render.
   *
   * This used to be inferred from `isEntitled` plus a candidate count, with
   * "paid, ID still under review" kept in a local ref. The ref did not survive
   * a restart, so relaunching a paid-but-unverified account fell through to the
   * introductions card — the app reporting a profile as verified when no
   * verification had happened. `/matches/home-state` resolves verification,
   * billing, completeness and matching together, which is the only place all of
   * those are known at once.
   *
   * The flags are computed first and applied in one go. Clearing them up front
   * and filling them in afterwards leaves the screen with nothing to render if
   * the request fails, which is a blank page rather than a stale one.
   */
  const refreshHomeState = useCallback(async (isInitial = false) => {
    try {
      const { state, data } = await getHomeState();

      /**
       * Paid, as the server reports it.
       *
       * Read once here, at the single point that resolves the home state,
       * rather than at each card: the branches below all consult it, and
       * overriding one and not another is how a screen ends up claiming a
       * membership another screen denies.
       */
      const isPaid = data.isPaid;

      // Refreshed on the same signal as everything else here, so the badge
      // tracks answered requests without its own fetch or subscription.
      setPhotoRequestsBadge(data.incomingPhotoRequests ?? 0);
      refreshNotificationCount();

      const flags = {
        paymentFailed: false,
        underReviewUnpaid: false,
        underReviewPaid: false,
        proposalsReadyUnpaid: false,
        introductionAvailable: false,
        profileIncomplete: false,
        waliRequired: false,
      };

      switch (state) {
        case 'PAYMENT_FAILED':
          flags.paymentFailed = true;
          break;

        // Nothing has verified this profile yet, so the introductions card must
        // not be shown whatever the billing state says.
        //
        // `data.verification.status` separates these: PENDING is genuinely
        // under review, null means nothing was ever submitted. Both landed on
        // the same "we are reviewing your profile" card, which told users with
        // no submission that one was in progress.
        case 'VERIFICATION_NOT_STARTED':
        case 'VERIFICATION_FAILED':
        case 'RESUBMIT_REQUIRED':
        case 'UNDER_REVIEW_UNPAID':
        case 'UNDER_REVIEW_PAID':
          if (isPaid) flags.underReviewPaid = true;
          else flags.underReviewUnpaid = true;
          break;

        case 'MATCHES_FOUND_UNPAID':
          // The paywall card, unless this device is standing in for a payment —
          // in which case the state it would have reached is the search itself.
          if (isPaid) flags.introductionAvailable = true;
          else flags.proposalsReadyUnpaid = true;
          break;

        // Verified and searching, but nobody to show right now.
        // The block renders; the feed request decides whether it has a card.
        case 'NO_MATCHES_IN_CITY':
        case 'CRITERIA_TOO_NARROW':
        case 'NO_MATCHES_TODAY':
          flags.introductionAvailable = true;
          break;

        case 'INTRO_AVAILABLE':
        case 'AWAITING_WALI_APPROVAL':
        case 'PHOTO_REQUEST_SENT':
        case 'PHOTO_SHARED':
        case 'PHOTO_REQUEST_DECLINED':
        case 'INCOMING_PHOTO_REQUEST':
        case 'SEARCH_JUST_STARTED':
        case 'FALLBACK':
          flags.introductionAvailable = true;
          break;

        // The profile itself is unfinished, which has its own card. Routing it
        // to the review screen told a user with an incomplete profile that we
        // were reviewing it — and, once verification was approved, left them on
        // a card still asking them to verify.
        case 'PROFILE_INCOMPLETE':
          flags.profileIncomplete = true;
          break;

        // Verified, but nobody is guarding: discovery excludes them and the
        // server refuses their proposals, so showing a live search would
        // describe one they are not part of.
        //
        // Only for a paid account. The card tells the user their membership is
        // active and that a wali is the one thing left — for someone who has not
        // paid, the first half is false and the second is the wrong ask: the
        // membership is what stands between them and an introduction, and adding
        // a wali would not change that. Unpaid falls to the same two cards as
        // every other unpaid state, chosen the same way.
        case 'WALI_REQUIRED':
          if (isPaid) flags.waliRequired = true;
          else if (data.matchCount > 0) flags.proposalsReadyUnpaid = true;
          else flags.underReviewUnpaid = true;
          break;

        // Account-level states the home screen has no card for. Showing the
        // search card would be a lie, so fall back to the review screen.
        case 'SUSPENDED':
        case 'DELETION_PENDING':
        default:
          if (isPaid) flags.underReviewPaid = true;
          else flags.underReviewUnpaid = true;
          break;
      }

      // "Under review" requires a PENDING status AND every required type
      // submitted. Status alone was not enough: submitting only the face scan
      // left GOVERNMENT_ID outstanding, yet the card claimed a review had
      // started and dropped the button that leads to the remaining step.
      // Approved counts as "nothing more to do here" for the review card, which
      // otherwise only knew PENDING and would show the verify prompt instead.
      setVerificationPending(
        data.verification.status === 'APPROVED' ||
          (data.verification.status === 'PENDING' &&
            hasSubmittedAllVerifications(data.verification.types)),
      );
      // Only when something is still outstanding. An APPROVED verification has
      // nothing left to do, but fell through to the "One step left" copy
      // because the check only asked whether every type was present — and an
      // approved user was told to verify again.
      setVerificationPartial(
        data.verification.status !== 'APPROVED' &&
          data.verification.types.length > 0 &&
          !hasSubmittedAllVerifications(data.verification.types),
      );
      // Which steps F16 shows as done. Local state alone forgot them on every
      // relaunch, so a submitted face scan came back as still outstanding.
      const submittedTypes = new Set(data.verification.types.map(t => t.type));
      setFaceDone(submittedTypes.has('SELFIE_LIVENESS'));
      setCnicDone(submittedTypes.has('GOVERNMENT_ID'));
      setVerificationSubmittedAt(
        data.verification.submittedAt
          ? new Date(data.verification.submittedAt)
          : undefined,
      );
      setVerificationApproved(data.verification.status === 'APPROVED');
      setIsPaidMember(isPaid);
      setMatchCount(data.matchCount);
      setPaymentFailed(flags.paymentFailed);
      setUnderReviewUnpaid(flags.underReviewUnpaid);
      setUnderReviewPaid(flags.underReviewPaid);
      setProposalsReadyUnpaid(flags.proposalsReadyUnpaid);
      setIntroductionAvailable(flags.introductionAvailable);
      // Deliberately does NOT write `hasIntroductions`.
      //
      // Whether there is a card to show is answered by the feed request, which
      // is the only query that carries the session's filters. `/matches/home-state`
      // counts against the *stored* preference, so with a filter applied that
      // widens it the two disagree — the server says NO_MATCHES_IN_CITY while the
      // filtered feed has results. Both used to write this flag, so a card would
      // appear and then vanish the moment a refresh landed: on every Home focus,
      // every return to the foreground, and every Realtime event.
      //
      // `introductionAvailable` above stays server-owned; it decides which block
      // renders, which is a different question from whether the block has a card.
      setServerProfileIncomplete(flags.profileIncomplete);
      setWaliRequired(flags.waliRequired);

      // Only H6 needs the section breakdown, so it is fetched only when the
      // server says the profile is short. A failure here leaves the card on
      // its `resumeScreen` fallback rather than blanking the screen.
      if (flags.profileIncomplete) {
        setProfileCompletionLoading(true);
        try {
          setProfileCompletion(await getProfileCompletion());
        } catch {
          setProfileCompletion(undefined);
        } finally {
          setProfileCompletionLoading(false);
        }
      } else {
        setProfileCompletion(undefined);
        setProfileCompletionLoading(false);
      }
      setHomeStateLoaded(true);
    } catch {
      // On launch there is no prior state to keep, so fall back to H8 (under
      // review) rather than an empty screen. On a refresh, a network blip must
      // not demote a paid user — leave whatever is on screen alone.
      if (isInitial) setUnderReviewUnpaid(true);
      // A spinner with nothing behind it is worse than the fallback card, so the
      // gate lifts even when the request failed.
      setHomeStateLoaded(true);
    }
    // `refreshNotificationCount` is itself memoised with no deps, so this
    // stays stable; listed rather than suppressed so it cannot go stale if
    // that ever changes.
  }, [refreshNotificationCount]);

  // Nothing is known about a newly signed-in user's home state, and the flags
  // still hold the previous session's answers. Without this reset a sign-out and
  // sign-in would show the old user's card for a moment.
  useEffect(() => {
    setHomeStateLoaded(false);
    // The section report belongs to the signed-in user, so a new one starts
    // with no answer and a request on the way — not with the last user's.
    setProfileCompletion(undefined);
    setProfileCompletionLoading(true);
  }, [userId]);

  /**
   * Seed the filter defaults from the *stored* preference.
   *
   * `preferenceFilters` used to be written only by an in-session save, so after
   * a relaunch the filter screens fell back to hard-coded defaults while the
   * server kept filtering the feed by what was actually saved. Reading it here
   * means every screen that shows "your preferences" is showing the server's
   * copy.
   */
  const loadStoredPreferences = useCallback(async (): Promise<void> => {
    try {
      const profile = await getMyProfile();
      // Before the early return below: the city is on the profile, not the
      // preference, so an account with no preference row still has one.
      if (profile.city) setIntroductionCity(profile.city);
      if (!profile.partnerPreference) return;
      const stored = withPreferenceDefaults(
        preferencesFromApi(profile.partnerPreference),
      );
      setPreferenceFilters(stored);
      setObAgeMin(stored.ageMin);
      setObAgeMax(stored.ageMax);
    } catch {
      /* defaults stand */
    }
  }, []);

  useEffect(() => {
    if (isWali || !userId) return;
    loadStoredPreferences();
  }, [isWali, userId, loadStoredPreferences]);

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

  /**
   * Open the billing connection and recover any purchase Google is still
   * holding, on launch and on every foreground.
   *
   * This is the safety net for a purchase that completed at Play but never
   * reached the server — the app was killed, or the verify call failed. Google
   * auto-refunds a purchase nobody acknowledges after three days, so without
   * this a user is charged, gets nothing, and is quietly refunded later. It is
   * also what restores a membership after a reinstall.
   *
   * Entirely silent: the user did not ask for this, so a failure here shows
   * nothing. `refreshHomeState` above is what makes a recovered entitlement
   * appear.
   */
  useEffect(() => {
    if (isWali || !userId || !STORE_PURCHASES_SUPPORTED) return;

    let cancelled = false;

    const recover = async () => {
      // Play's purchase sheet is a separate activity, so finishing a purchase
      // sends this app background → active and fires the listener below — while
      // the F17 handler is still mid-flight with the very same token. Both would
      // then POST it at once, and the server's replay check reads before it
      // writes, so concurrency is exactly what it cannot catch. The buy flow
      // owns the purchase it is making; this pass only cleans up after it.
      if (payInFlight.current || recoverInFlight.current) return;

      recoverInFlight.current = true;
      try {
        for (const purchase of await getUnfinishedPurchases()) {
          if (cancelled || payInFlight.current) return;
          try {
            const result = await restorePurchase(purchase.purchaseToken ?? '');
            if (result.isEntitled) {
              await finishMembershipPurchase(purchase);
              refreshHomeState();
            }
          } catch {
            // Leave it queued — Play will offer it again next foreground.
          }
        }
      } finally {
        recoverInFlight.current = false;
      }
    };

    // Re-read on every foreground too: a null first answer (Play mid-update at
    // launch) would otherwise leave a non-PK user staring at the PKR fallback
    // for the whole session.
    const refreshPrice = () => {
      getMembershipPrice().then(price => {
        if (!cancelled && price) setStorePrice(price);
      });
    };

    initIap().then(() => {
      if (cancelled) return;
      refreshPrice();
      recover();
    });

    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      refreshPrice();
      recover();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [isWali, userId, refreshHomeState]);

  /**
   * Drop the paywall error whenever the paywall is not on screen.
   *
   * Keyed on `screen` rather than cleared at each of the several call sites that
   * navigate to F17 — H5 retry, H5 change-method, H8/H12 become-a-member — so a
   * route added later cannot reintroduce a stale error greeting the user under
   * the button before they have touched anything.
   */
  useEffect(() => {
    if (screen !== 'F17' && payError) setPayError(undefined);
  }, [screen, payError]);

  // Reload introductions and stats when active filters change (manual filters or saved preferences).
  // Resets the feed so results reflect the new criteria from the start.

  /**
   * Load the feed and its stats — on reaching H16, and again whenever the
   * criteria change.
   *
   * One effect, not two. There used to be a separate initial-load effect keyed
   * on `introductionAvailable` alongside this one, so arriving at H16 fired two
   * identical request pairs, and a third followed as soon as the stored
   * preferences resolved. Beyond the wasted round trips they raced each other
   * for the "X of Y" total.
   */
  useEffect(() => {
    if (!introductionAvailable) return;
    isFirstIntroLoad.current = true;
    setIntroductionIndex(1);
    setTotalIntroductions(null);
    loadNextIntroduction();
    getHomeStats(sessionFiltersRef.current)
      .then(stats => {
        setMatchCriteria(stats.matchCriteria);
        setReviewedThisWeek(stats.reviewedThisWeek);
      })
      .catch(() => { /* keep default zeros on network failure */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introductionAvailable, appliedFilters, preferenceFilters]);

  // Re-fetch stats whenever the server signals a change via Supabase Realtime.
  useHomeRealtime(userId, () => {
    if (!introductionAvailable) return;
    getHomeStats(sessionFiltersRef.current)
      .then(stats => {
        setMatchCriteria(stats.matchCriteria);
        setReviewedThisWeek(stats.reviewedThisWeek);
      })
      .catch(() => {});
  });

  // The bell badge, live: the server broadcasts the moment a notification row
  // is created, so it never sits stale behind a manual refresh.
  useNotificationsRealtime(userId, refreshNotificationCount);

  /**
   * A tap on a push, from either state that produces one.
   *
   * Routed off the payload the server attaches in `notifications.listener.ts`,
   * whose keys are per-type: MESSAGE_RECEIVED carries `matchId` (not a
   * conversation id — the chat list is what maps one to the other), while a
   * proposal event carries `matchId` or `fromUserId` and only needs the tab.
   */
  const openFromPush = useCallback((data: PushData) => {
    switch (data.type) {
      case 'MESSAGE_RECEIVED': {
        const chat = data.matchId
          ? chatsRef.current.find(c => c.matchId === data.matchId)
          : undefined;
        if (chat) {
          setActiveChatId(chat.id);
          navigate('ChatThread');
        } else {
          // Tapped from a cold start, before the chat list exists. Remember it
          // and let the effect below open the thread once the list lands —
          // dropping the user on the list screen would make the notification
          // feel like it had lost the message it was announcing.
          if (data.matchId) pendingPushMatchId.current = data.matchId;
          setActiveTab('chats');
          navigate('Chats');
        }
        break;
      }
      case 'MATCH_CREATED':
      case 'INTEREST_RECEIVED':
        setActiveTab('proposals');
        navigate('Home');
        break;
      case 'WALI_APPROVAL_NEEDED':
      case 'WALI_APPROVAL_GRANTED':
        setActiveTab('family');
        navigate('Home');
        break;
      default:
        navigate('NotificationFeed');
    }
    // Whatever it was, it has been seen — keep the bell honest.
    refreshNotificationCount();
  // `navigate` is a hoisted function declaration, so it is safe to call from
  // here even though it is defined further down the component.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNotificationCount]);

  /** A matchId from a push that arrived before the chat list did. */
  const pendingPushMatchId = useRef<string | null>(null);
  /** The current chat list, for callbacks that must not re-subscribe on it. */
  const chatsRef = useRef<ChatSummary[]>([]);
  useEffect(() => { chatsRef.current = chats; }, [chats]);

  useEffect(() => {
    const matchId = pendingPushMatchId.current;
    if (!matchId || chats.length === 0) return;
    const chat = chats.find(c => c.matchId === matchId);
    if (!chat) return;
    pendingPushMatchId.current = null;
    setActiveChatId(chat.id);
    navigate('ChatThread');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats]);

  /**
   * Push registration.
   *
   * Keyed on `userId` so the token is attached to whoever is signed in: the
   * server upserts on the token, so signing in as someone else on the same
   * handset re-points the row rather than leaving two owners.
   */
  useEffect(() => {
    if (!userId) return;
    registerPushToken();
    const unsubs = [
      subscribeToTokenRefresh(),
      // Android raises no tray notification while the app is foregrounded, so
      // the payload comes straight here. The Supabase channel is already
      // refreshing the screen itself; this only keeps the bell in step.
      subscribeToForegroundMessages(() => refreshNotificationCount()),
      subscribeToNotificationTaps(openFromPush),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [userId, refreshNotificationCount, openFromPush]);

  // Wali: re-fetch ward proposals whenever any proposal changes (sent, withdrawn, stage change).
  useProposalsRealtime(userId, () => {
    if (!isWali) return;
    loadWaliProfile().catch(() => {});
  });

  // ── shared chat list mapper (newest message on top) ─────────────────────────
  /**
   * Open a counterpart's profile.
   *
   * Extracted from the Proposals prop so the chat thread can reuse it: the
   * fetch-and-map is fifty lines, and a second copy would drift.
   */
  // Not memoised: `navigate` is a plain function redeclared each render, so an
  // empty dep list would pin this to the first one ever created.
  /** The counterpart in the open thread, when the list knows who that is. */
  const activeChatPartner = (() => {
    const chat = chats.find(c => c.id === activeChatId);
    return chat?.partnerUserId
      ? { userId: chat.partnerUserId, matchId: chat.matchId ?? null }
      : null;
  })();

  /**
   * Take the user to whatever a notification is about.
   *
   * Every type carries the ids it needs in `data` (see notifications.listener)
   * — a matchId, a counterpart, a proposal — so this resolves a destination
   * from the type rather than dumping everyone on Home.
   *
   * A wali and a seeker get different destinations from the same notification:
   * a guardian's "proposal needs your approval" belongs in their review queue,
   * not a seeker's proposals tab.
   */
  const openNotification = (n: {
    type: string;
    data?: Record<string, unknown> | null;
  }) => {
    const data = n.data ?? {};
    const matchId = typeof data.matchId === 'string' ? data.matchId : null;

    /** Open the thread for a match, if the chat list knows it yet. */
    const openThreadFor = (mid: string | null): boolean => {
      if (!mid) return false;
      const chat = chats.find(c => c.matchId === mid);
      if (!chat) return false;
      setActiveChatId(chat.id);
      navigate('ChatThread');
      return true;
    };

    switch (n.type) {
      // Both sides can now talk, so the conversation is the useful place.
      // Falls back to the chat list when the thread is not in state yet —
      // better than a dead tap while the list is still loading.
      case 'MATCH_CREATED':
      case 'MESSAGE_RECEIVED':
        if (openThreadFor(matchId)) return;
        if (isWali) { setActiveTab('chats'); navigate('Home'); return; }
        navigate('Chats');
        return;

      // Something is waiting on a decision.
      case 'INTEREST_RECEIVED':
      case 'WALI_APPROVAL_NEEDED':
      case 'WALI_APPROVAL_GRANTED':
        setActiveTab('proposals');
        navigate('Home');
        return;

      case 'INVITE_ACCEPTED':
        setActiveTab('family');
        navigate('Home');
        return;

      case 'VERIFICATION_APPROVED':
      case 'VERIFICATION_REJECTED':
        navigate('Home');
        return;

      // Payment and membership announcements land on the membership screen;
      // anything else system-level has no better destination than Home.
      case 'SYSTEM':
        navigate(data.paymentId ? 'Membership' : 'Home');
        return;

      // A profile view and the weekly nudge are both "come and look" — the
      // feed is Home's job, so that is where they go.
      default:
        navigate('Home');
    }
  };

  /**
   * Tokens are stored — work out which screen the user belongs on.
   *
   * Shared by password sign-in and Google sign-in: both arrive here with a
   * session and nothing else decided. Duplicating it is how the two routes
   * would drift on onboarding resume, which is the fiddliest part.
   */
  function enterAppWithSession(loginRole?: string): Promise<void> {
    return getMe()
      .then(me => {
        setUserId(me.user.id);
        setUserName(firstNameFrom(me.profile.fullName, me.user.email));

        // Wali users have a separate flow — route to the right step.
        // Check role from /auth/me or from the login response directly.
        const isWaliUser = me.user.role?.toLowerCase() === 'wali' || loginRole?.toLowerCase() === 'wali';
        applyRole(isWaliUser ? 'wali' : 'self');
        if (isWaliUser) {
          if (me.user.email) setUserEmail(me.user.email);
          setWaliLoading(true);
          loadWaliProfile().catch(() => {}).finally(() => setWaliLoading(false));
          const step = screenForStep(me.profile.onboardingStep) as Screen | undefined;
          // The registration placeholder is not a name he gave, so treat it
    // as missing and send him through WaliDetails to state one.
    const waliNameMissing =
    !me.profile.fullName ||
    isPlaceholderName(me.profile.fullName, me.user.email);
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

        // Same gate as session restore: an unverified email OR phone
        // goes back to the verification screen rather than Home. The
        // sign-in response only reports the email, so the check has to
        // happen here where the server's answer for both is available.
        const needsEmail = me.user.email && !me.user.emailVerified;
        const needsPhone = me.profile.phone && !me.user.phoneVerified;
        if (needsEmail || needsPhone) {
          if (me.user.email) setUserEmail(me.user.email);
          if (me.profile.phone) setPhoneE164(me.profile.phone);
          setPendingEmail(me.user.email || '');
          savePendingEmail(me.user.email || '').catch(() => {});
          navigate('AccountVerification', { reset: true });
          return;
        }

        if (me.profile.onboardingCompleted) {
          setOnboardingComplete(true);
          // Ask the server what this account's home state is; do not assume
          // "onboarding complete" means verified. Awaited so Home paints the
          // real state on first frame instead of an empty screen.
          return refreshHomeState(true).then(() => navigate('Home'));
        } else if (me.profile.onboardingStep) {
          const dest = destinationForSavedStep(me.profile.onboardingStep);
          if (dest.resumeAt) setResumeScreen(dest.resumeAt);
          if (dest.kind === 'complete') {
            setOnboardingComplete(true);
            // Ask the server what this account's home state is; do not assume
            // "onboarding complete" means verified. Awaited so Home paints the
            // real state on first frame instead of an empty screen.
            return refreshHomeState(true).then(() => navigate('Home'));
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
        // Ask the server what this account's home state is; do not assume
        // "onboarding complete" means verified. Awaited so Home paints the
        // real state on first frame instead of an empty screen.
        return refreshHomeState(true).then(() => navigate('Home'));
      });
  }

  const openCounterpartProfile = (
    userId: string,
    type: 'sent' | 'received',
    matchId: string | null,
  ) => {
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
                  photosWithheld: intro.photosWithheld,
                  photoRequestStatus: intro.photoRequestStatus ?? null,
                  photoRequestWaitingOn: intro.photoRequestWaitingOn ?? null,
                  hideDistance: intro.hideDistance,
                  distanceKm: intro.distanceKm,
                  gender: intro.gender,
                  heightCm: intro.heightCm,
                  maritalStatus: intro.maritalStatus,
                  hasChildren: intro.hasChildren,
                  willingToRelocate: intro.willingToRelocate,
                  sect: intro.sect,
                  madhhab: intro.madhhab,
                  religiosity: intro.religiosityLevel,
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
  };

  const mapChatItems = useCallback((items: ChatListItem[]) => {
    const mapped = items.map(c => ({
      id: c.id,
      matchId: c.matchId,
      partnerUserId: c.partnerUserId,
      name: c.partnerName,
      age: c.partnerAge,
      // Passed through as null rather than coalesced. The old fallbacks made
      // an empty conversation look like one that had just been active: a blank
      // preview line, a "Just now" stamp, and — because the fallback was the
      // current clock — a sort key that jumped to the top on every refresh.
      lastMessage: c.lastMessage ?? null,
      lastMessageAt: c.lastMessageAt ?? null,
      lastMessageSenderId: c.lastMessageSenderId,
      myUserId: userId,
      participantCount: c.participantCount,
      unreadCount: c.unreadCount,
    }));
    // Newest conversation first; one with no messages sorts last, matching how
    // the server already orders the same list — the two used to disagree, and
    // this one silently won.
    mapped.sort(byNewestMessage);
    return mapped;
  }, [userId]);

  // Real-time refresh — fires when any conversation in the backend gets a new message.
  // This is the ONLY mechanism that updates the chat list after initial load.
  useChatListRealtime(userId, () => {
    listConversations()
      .then(items => setChats(mapChatItems(items)))
      .catch(() => {});
  });

  // Messages that land while the app is backgrounded miss the realtime
  // broadcast above, so the unread badge would come back stale. Re-sync the
  // list on every foreground.
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      listConversations()
        .then(items => setChats(mapChatItems(items)))
        .catch(() => {});
    });
    return () => sub.remove();
  }, [userId, mapChatItems]);

  // Opening a thread marks it seen on the server, but the server answers with
  // `chat:seen` on the thread channel — not `chats:stale` on the list one — so
  // nothing clears the count here. Without this the nav badge keeps counting a
  // conversation the user is currently reading.
  useEffect(() => {
    if (screen !== 'ChatThread' || !activeChatId) return;
    setChats(prev =>
      prev.some(c => c.id === activeChatId && (c.unreadCount ?? 0) > 0)
        ? prev.map(c => (c.id === activeChatId ? { ...c, unreadCount: 0 } : c))
        : prev,
    );
  }, [screen, activeChatId]);

  // Initial load — as soon as the session resolves, not when the Chats screen
  // is first opened. The Chats tab badge lives in the bottom nav on every
  // screen, so gating the only fetch on `screen === 'Chats'` meant an unread
  // conversation showed no badge until the user opened the very screen the
  // badge exists to point them at.
  // After this, useChatListRealtime keeps it up to date in real-time.
  // Keyed on `userId` so it runs once per session, not on every screen change —
  // that's what avoided the reload flash when coming back from a chat thread.
  useEffect(() => {
    if (!userId || isWali) return;
    setChatsLoading(true);
    listConversations()
      .then(items => setChats(mapChatItems(items)))
      .catch(() => {})
      .finally(() => setChatsLoading(false));
  }, [userId, isWali]); // eslint-disable-line react-hooks/exhaustive-deps

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
    Promise.all([getAccessToken(), getPendingEmail(), getPendingPhone()]).then(async ([token, pendingStored, pendingPhone]) => {
      let pending = pendingStored;
      if (pending) {
        setPendingEmail(pending);
        if (pendingPhone) setPhoneE164(pendingPhone);
        // The number belongs to the account, not to this install. Signing in
        // again on a fresh install leaves getPendingPhone() empty, and the
        // verify screen hides the phone row when it has no number at all — so
        // ask the server, which is the only place that actually knows.
        //
        // The same answer also decides whether this branch should run at all.
        // The pending key means "someone still has to verify something", but
        // only the email path ever cleared it — verify the phone last and it
        // outlived the thing it was tracking, sending a fully verified account
        // back to this screen on every cold start. The server's flags are the
        // truth; a key that disagrees with them is stale, so drop it and
        // restore normally.
        if (token) {
          try {
            const me = await getMe();
            if (me.profile.phone) setPhoneE164(me.profile.phone);
            if (me.user.email) setUserEmail(me.user.email);
            const emailPending = !!me.user.email && !me.user.emailVerified;
            const phonePending = !!me.profile.phone && !me.user.phoneVerified;
            if (!emailPending && !phonePending) {
              await clearPendingEmail();
              setPendingEmail('');
              pending = '';
            }
          } catch {}
        }
        if (pending) {
          setScreen('AccountVerification');
          setAppReady(true);
          return;
        }
      }
      if (!token) { setAppReady(true); return; }

      getMe()
        .then(async me => {
          setUserId(me.user.id);
          setUserName(firstNameFrom(me.profile.fullName, me.user.email));

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
            // The registration placeholder is not a name he gave, so treat it
            // as missing and send him through WaliDetails to state one.
            const waliNameMissing =
              !me.profile.fullName ||
              isPlaceholderName(me.profile.fullName, me.user.email);
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
    'F1', 'SignInRole', 'SignIn', 'ForgotPassword', 'WhoIsFor', 'Phone', 'AccountVerification', 'Code',
    'WaliAccountSetup', 'WaliWelcome', 'WaliCode', 'WaliEmailVerify',
  ];

  /**
   * Any arrival back at the verification screen ends an edit trip.
   *
   * Not folded into the handlers that navigate there: Android's hardware back
   * goes through goBack(), which knows nothing about this flag, and a stale
   * 'email' would silently reopen the signup form in edit mode the next time
   * the user pressed the verification screen's own back chevron.
   */
  useEffect(() => {
    if (screen === 'AccountVerification') setContactEdit(null);
    // Leaving F16 by any route ends the standalone trip — including Android's
    // back, which this flag is not otherwise told about.
    if (screen !== 'F16' && verifyFromHome) setVerifyFromHome(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  /**
   * Seed the verification rows from the server whenever this screen is shown.
   *
   * Both flags used to live only in this component tree, so a reload — or any
   * remount — put an already-confirmed address back behind a "Verify" button.
   * The server is the only durable record, and it is reachable here because
   * verifying the email returns a session.
   *
   * Silent on failure: during signup, before anything is confirmed, there is no
   * token and /auth/me 401s. Nothing is verified at that point anyway, so the
   * false defaults are already correct.
   */
  useEffect(() => {
    if (screen !== 'AccountVerification') return;
    const screenEmail = (pendingEmail || userEmail).trim().toLowerCase();
    if (!screenEmail) return;
    let cancelled = false;
    // Skeleton only before the first answer for this address. On a refetch the
    // rows already show real values, and swapping them back to placeholders
    // made the email vanish and the cards reflow every time the status was
    // re-checked — including right after pressing Continue.
    if (loadedStatusForRef.current !== screenEmail) {
      setVerificationStatusLoading(true);
    }
    const settle = () => {
      if (cancelled) return;
      loadedStatusForRef.current = screenEmail;
      setVerificationStatusLoading(false);
    };

    // Ask about *this* signup by address rather than about whoever holds the
    // token. It needs no session, so it also answers in the window after the
    // phone is verified but before the email is — where there is no token at
    // all — which is what made the phone row forget itself on a reload.
    getPendingStatus(screenEmail)
      .then(status => {
        if (cancelled) return;
        setServerEmailVerified(status.emailVerified);
        // Always adopt the number, verified or not: the screen hides the whole
        // mobile card when it has none, so seeding it only on success made an
        // unverified phone disappear instead of offering a Verify button.
        if (status.phone) {
          setPhoneE164(status.phone);
          if (status.phoneVerified) setVerifiedPhoneE164(status.phone);
        }
        settle();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // A 400 is the endpoint saying there is no unconfirmed signup for this
        // address — confirmed already, so /auth/me is the right source from
        // here. Any other failure says nothing about the address, and must
        // leave the screen alone rather than accuse the user of owning an
        // account (see `meansNoPendingSignup`).
        if (meansNoPendingSignup(err)) {
          seedFromSession();
          return;
        }
        settle();
      });

    function seedFromSession() {
      getAccessToken().then(token => {
      // No pending signup *and* no session. `pending-status` answers 400 for a
      // confirmed account on purpose — it must not become a way to probe real
      // addresses — so landing here means this email is already registered and
      // confirmed, and this screen can never finish: "Verify" asks Supabase to
      // resend a signup confirmation for an address it considers confirmed,
      // which it refuses, and the endpoint's deliberate 204 makes that look
      // like success. Send them to sign in instead of leaving them tapping a
      // button that can only ever say "New code sent".
      if (!token) {
        settle();
        Alert.alert(
          'You already have an account',
          'This email is verified. Sign in to continue.',
          [{ text: 'Sign in', onPress: () => navigate('SignIn', { reset: true }) }],
        );
        return;
      }
      if (cancelled) return;
      getMe()
        .then(me => {
          if (cancelled) return;
          // The token may still belong to a PREVIOUS account: signing up again
          // without signing out first leaves the old session in storage, and
          // /auth/me answers for whoever the token identifies — not for the
          // signup on screen. Seeding from that marked a brand-new address as
          // verified. Each field is therefore only trusted when the server's
          // value is the same one being shown here.
          const meEmail = (me.user.email || '').trim().toLowerCase();
          const sameAccount = !!screenEmail && meEmail === screenEmail;
          setServerEmailVerified(!!me.user.emailVerified && sameAccount);
          if (sameAccount && me.profile.phone) {
            setPhoneE164(me.profile.phone);
            if (me.user.phoneVerified) setVerifiedPhoneE164(me.profile.phone);
          }
          settle();
        })
        .catch(settle);
      }).catch(settle);
    }

    return () => { cancelled = true; };
  // `navigate` is a plain function declaration, so it is a new value every
  // render — listing it would re-run this status fetch on each one. The three
  // deps below are what actually decide which signup is being asked about.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, pendingEmail, userEmail]);

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
      // The account already exists by the time this screen shows, so there is
      // nothing valid to go back to — swallow the gesture rather than dropping
      // the user into the signup form behind a live account.
      if (screen === 'AccountVerification') return true;
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
  /**
   * Back handler for an onboarding screen, or undefined when there is nowhere
   * valid to go.
   *
   * Each step hardcodes the step before it, which is right while the user walks
   * the flow forward but wrong when they *resume* into the middle of it: the
   * first screen of a resumed session has no history behind it, so the first
   * step's hardcoded target sent a signed-in user with a half-built profile to
   * "Create account as" — a signup screen for an account that already exists,
   * and one that reads as having been logged out.
   *
   * Real history wins where there is any; otherwise the screen is an entry
   * point and reports no back at all, so the caller can hide the control rather
   * than show one that does nothing.
   */
  /**
   * True when this onboarding screen was entered from Home rather than walked to
   * during signup — "Continue profile" and friends.
   *
   * The same test `onboardingBack` uses to decide there is nowhere to go back
   * to, named separately because the two questions have different answers
   * elsewhere: an entry point still needs a way *out*, just not a Back.
   */
  function enteredFromHome(): boolean {
    const stack = prunePreAuth(historyRef.current);
    // Anywhere in the stack, not just the top. Checking only the most recent
    // entry answered "did I arrive here *from* Home", which is true of the first
    // screen of the trip and false of every one after it — so advancing a step
    // swapped the ✕ back to "Log out" mid-way through finishing a profile.
    //
    // The question is whether this whole trip started at Home, and Home stays in
    // the stack for as long as it did. A fresh signup never has it: the flow
    // begins at F1, which `prunePreAuth` drops once there is an account.
    return authedRef.current && stack.some(sc => ROOT_SCREENS.includes(sc));
  }

  /**
   * The exit control an onboarding screen should offer, as props to spread.
   *
   * Two shapes, because the screen has two entry points:
   *   • opened from Home to finish a section — an ✕ back to Home;
   *   • walking the signup — the account exists but nothing is finished, so the
   *     only way out is to abandon it.
   *
   * Returned as one object so every step gets the same rule from one place
   * rather than each site re-deriving it.
   */
  function onboardingExit(): {
    onClose?: () => void;
    onLogout?: () => void;
  } {
    if (enteredFromHome()) return { onClose: () => navigate('Home') };
    return {
      onLogout: async () => {
        await signOutAndClearCaches();
        await clearPendingEmail();
        setPendingEmail('');
        setUserEmail('');
        setUserPassword('');
        setUserId('');
        applyRole('self');
        navigate('F1', { reset: true });
      },
    };
  }

  function onboardingBack(fallback: Screen): (() => void) | undefined {
    const stack = prunePreAuth(historyRef.current);

    // Jumped straight in from Home — "Continue profile", "Verify my identity" —
    // so this screen starts its own trip. The step the flow's order puts behind
    // it is one the user already finished, and there is no earlier screen of
    // theirs to return to, so the control is omitted rather than pointed
    // somewhere arbitrary. Android's back still reaches Home.
    if (authedRef.current && stack.length > 0 && ROOT_SCREENS.includes(stack[stack.length - 1])) {
      return undefined;
    }

    if (!authedRef.current || !PRE_AUTH_SCREENS.includes(fallback)) {
      return () => navigate(fallback);
    }
    if (stack.length > 0) {
      return () => { goBack(); };
    }
    return undefined;
  }

  /**
   * Go back to wherever the user actually came from.
   *
   * For a screen with one entry point a hardcoded destination is equivalent,
   * but `ProfileDetail` has four and `ChatThread` has four — a fixed target is
   * right for one caller and wrong for the rest. `historyRef` already records
   * the real answer; the fallback only covers a cold start with an empty stack.
   */
  function goBackOr(fallback: Screen): void {
    if (!goBack()) navigate(fallback);
  }

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
    // Issued on the press, before the screen changes.
    //
    // It used to run after `setScreen`, so the write was a consequence of
    // arriving at the next step rather than of the button being pressed — and
    // anything that interrupted the transition could drop it. Still not
    // awaited: the step only decides where a reinstall resumes, so making the
    // user watch a round trip on every Continue buys nothing.
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

    directionRef.current = 'forward';
    historyRef.current = ROOT_SCREENS.includes(to)
      ? []
      : [...historyRef.current, screen];
    setScreen(to);
  }

  /**
   * Verify a Play purchase with the server and, if it grants the membership,
   * finish it with Play and move the user on.
   *
   * Shared by the buy flow and the "you already own this" recovery below, so
   * both land in exactly the same place — the two used to be one inline block
   * and a dead end respectively.
   */
  async function activateMembership(
    purchase: StorePurchaseRecord,
  ): Promise<boolean> {
    const result = await verifyPurchase(
      {
        provider: 'google_play',
        payload: { purchaseToken: purchase.purchaseToken ?? '' },
      },
      MEMBERSHIP_PRODUCT_ID,
    );

    if (!result.isEntitled) {
      setPaymentFailed(true);
      navigate('Home');
      return false;
    }

    // Only after the grant is recorded. The server acknowledges with Google
    // independently; this clears the purchase from Play's local queue so it is
    // not redelivered on every launch.
    await finishMembershipPurchase(purchase);
    setPaymentFailed(false);
    setUnderReviewPaid(true);
    const n = stepNumberFor('F18');
    if (n != null) saveOnboardingStep(n).catch(() => {});
    navigate('F18');
    return true;
  }

  /**
   * Redeem a purchase Play is holding but never had confirmed — the state behind
   * its "already owned" refusal. Returns whether one was successfully activated.
   */
  async function redeemUnfinishedPurchase(): Promise<boolean> {
    for (const purchase of await getUnfinishedPurchases()) {
      try {
        if (await activateMembership(purchase)) return true;
      } catch {
        // Try the next one; the caller reports failure if none work.
      }
    }
    return false;
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
    // No `acceptsChildren`: that is a PartnerPreference field, not a
    // FilterValues one, and was being discarded here rather than applied.
  };

  // Always reflects the active filter priority chain: manual > preferences > onboarding.
  // Written every render (ref write = no re-render) so loadNextIntroduction never stales.
  const activeFiltersRef = useRef<IntroductionFilters>(onboardingFilters);
  activeFiltersRef.current = appliedFilters ?? preferenceFilters ?? onboardingFilters;
  /**
   * The session overrides sent with the feed and the stats — nothing more.
   *
   * Only what the user actually applied on the filters screen. The stored
   * preference is already on the server, so sending it back can only make the
   * two disagree, and the defaults sitting behind it are not choices: `cities`
   * has no server column and falls back to a hard-coded 'Lahore', which as an
   * override silently filtered the feed by a city nobody picked.
   */
  const sessionFiltersRef = useRef<IntroductionFilters | undefined>(undefined);
  sessionFiltersRef.current = appliedFilters;

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
            // Carried over when a signup turned out to be an existing account.
            initialEmail={pendingEmail || userEmail || undefined}
            isWali={selectedRole === 'wali'}
            onSignIn={(_email, _password, emailVerified, _loginRole) => {
              // If email is not verified, redirect to AccountVerification immediately.
              if (!emailVerified && _email) {
                setUserEmail(_email);
                setPendingEmail(_email);
                savePendingEmail(_email).catch(() => {});
                // Whoever was here before must not leave their verified state
                // behind for this account.
                setServerEmailVerified(false);
                setVerifiedPhoneE164('');
                setPhoneE164('');
                setPhone('');
                // The number and both verification flags are seeded by the
                // verification screen's own effect, which reads them from
                // /auth/pending-status. Not getMe() — an unconfirmed address
                // has no session at all, so there is no token to call it with.
                // Reset: back must not return to the sign-in form, nor anywhere
                // further up the signup flow.
                navigate('AccountVerification', { reset: true });
                return;
              }
              // login() already saved tokens; check onboarding status.
              // Returned, not fired and forgotten: the screen awaits this to
              // decide when to drop its loader, and everything below — /auth/me,
              // then the home state — happens before there is a screen to show.
              return enterAppWithSession(_loginRole);
            }}
            onForgotPassword={(typed) => {
              // The sign-in field takes either an email or a phone, so route on
              // what they actually typed — passing a number in as an email
              // would open recovery on the wrong tab with the wrong value.
              const isPhone = /^\+?\d[\d\s-]{6,}$/.test(typed);
              setRecoveryEmail(isPhone ? '' : typed);
              setRecoveryPhone(isPhone ? typed.replace(/[\s-]/g, '') : '');
              navigate('ForgotPassword');
            }}
            googleError={googleError}
            onGoogleSignIn={async () => {
              setGoogleError(null);
              try {
                // Stores the session; the same routing then runs as after a
                // password sign-in, so onboarding resume behaves identically.
                await googleSignIn();
                await enterAppWithSession();
              } catch (e: any) {
                setGoogleError(
                  e?.message ?? 'Google sign-in failed. Please try again.',
                );
              }
            }}
            onCreateAccount={() => navigate('Phone')}
          />
        );

      // ── Phone ─────────────────────────────────────────────────────────────────
      case 'Phone':
        return (
          <PhoneScreen
            editing={!!contactEdit}
            focusField={contactEdit ?? undefined}
            // Only pre-filled when correcting a signup already in flight; a
            // fresh account starts on an empty form.
            initial={
              contactEdit
                ? {
                    phoneE164,
                    email: pendingEmail || userEmail,
                    // Empty after a relaunch, in which case the user retypes it
                    // — which is also what re-authorises the change.
                    password: userPassword,
                  }
                : undefined
            }
            onBack={() =>
              navigate(contactEdit ? 'AccountVerification' : 'WhoIsFor')
            }
            onSendCode={(ph, dialCode, email, password, e164) => {
              setPhone(`${dialCode} ${ph}`);
              setPhoneE164(e164);
              setUserEmail(email);
              setUserPassword(password);
              setPendingEmail(email);
              setEmailCodeSentAt(Date.now());
              savePendingPhone(e164);
              // A new signup starts from nothing verified. Both of these
              // otherwise carry over from whoever used the app last — which is
              // what showed a brand-new address as already verified.
              setServerEmailVerified(false);
              setVerifiedPhoneE164('');
              // Drop any previous session too: while it survives, /auth/me
              // answers for that account rather than this signup, and the user
              // is still carrying someone else's credentials.
              clearTokens().catch(() => {});
              navigate('AccountVerification');
            }}
            googleError={googleError}
            onGoogleSignIn={async () => {
              setGoogleError(null);
              try {
                // Stores the session; the same routing then runs as after a
                // password sign-in, so onboarding resume behaves identically.
                await googleSignIn();
                await enterAppWithSession();
              } catch (e: any) {
                setGoogleError(
                  e?.message ?? 'Google sign-in failed. Please try again.',
                );
              }
            }}
          />
        );

      // ── AccountVerification ───────────────────────────────────────────────────
      case 'AccountVerification':
        return (
          <AccountVerificationScreen
            phone={phoneE164 || phone}
            phoneDisplay={phone}
            email={pendingEmail || userEmail}
            phoneAlreadyVerified={
              !!phoneE164 && verifiedPhoneE164 === phoneE164
            }
            emailAlreadyVerified={serverEmailVerified}
            statusLoading={verificationStatusLoading}
            onPhoneVerified={setVerifiedPhoneE164}
            emailCodeSentAt={emailCodeSentAt}
            onLogout={async () => {
              await signOutAndClearCaches();
              // Clear the pending-signup keys too: leaving them behind would
              // send the restore effect straight back to this screen on the
              // next launch, which is the opposite of signing out.
              await clearPendingEmail();
              setPendingEmail('');
              setUserEmail('');
              setUserPassword('');
              setPhone('');
              setPhoneE164('');
              setVerifiedPhoneE164('');
              setServerEmailVerified(false);
              setUserId('');
              applyRole('self');
              navigate('F1', { reset: true });
            }}
            onVerified={() => {
              setPendingEmail('');
              // State only is not enough: the restore effect reads the stored
              // key, so leaving it behind is what put a verified user back on
              // this screen at the next launch. Verifying the email clears it
              // (AccountVerificationScreen.doVerifyEmail), verifying the phone
              // never did — clear it here so every exit path agrees.
              clearPendingEmail().catch(() => {});
              // Returned, not fired-and-forgotten: the screen awaits it to keep
              // the Continue button spinning until this resolves and navigates.
              // After verification, determine where to resume based on the user's state.
              return getMe()
                .then(me => {
                  setUserId(me.user.id);
                  setUserName(firstNameFrom(me.profile.fullName, me.user.email));
                  if (me.profile.onboardingCompleted) {
                    setOnboardingComplete(true);
                    // Ask the server what this account's home state is; do not assume
                    // "onboarding complete" means verified. Awaited so Home paints the
                    // real state on first frame instead of an empty screen.
                    return refreshHomeState(true).then(() => navigate('Home'));
                  } else if (me.profile.onboardingStep) {
                    const dest = destinationForSavedStep(me.profile.onboardingStep);
                    if (dest.resumeAt) setResumeScreen(dest.resumeAt);
                    if (dest.kind === 'complete') {
                      setOnboardingComplete(true);
                      // Ask the server what this account's home state is; do not assume
                      // "onboarding complete" means verified. Awaited so Home paints the
                      // real state on first frame instead of an empty screen.
                      return refreshHomeState(true).then(() => navigate('Home'));
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
            // Edited in place rather than by reopening the signup form: the
            // account already exists by now, so sending the user back to a form
            // whose job is to create one is the wrong shape. Re-registering is
            // still what moves the value — the server releases the unconfirmed
            // signup and re-creates it against the corrected details.
            onSaveContact={async ({ email: nextEmail, phone: nextPhone }) => {
              // Not a re-register: that needs the password, which is empty once
              // the signup form is gone (after a reload, or a pending signup
              // restored from storage) — the save then failed on a password
              // field the user could not even see.
              // Only the field that changed. The endpoint patches, and an
              // omitted key leaves the stored value alone — where an empty
              // string would be validated as a malformed phone number.
              await updatePendingContact({
                currentEmail: (pendingEmail || userEmail).trim().toLowerCase(),
                ...(nextEmail ? { email: nextEmail } : {}),
                ...(nextPhone ? { phone: nextPhone } : {}),
              });

              // Each side clears only its own verification: correcting an email
              // says nothing about whether the number is still proven.
              if (nextEmail) {
                await savePendingEmail(nextEmail);
                setUserEmail(nextEmail);
                setPendingEmail(nextEmail);
                setServerEmailVerified(false);
                setEmailCodeSentAt(Date.now());
              }
              if (nextPhone) {
                await savePendingPhone(nextPhone);
                setPhone(nextPhone);
                setPhoneE164(nextPhone);
                setVerifiedPhoneE164('');
              }
            }}
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
      case 'ForgotPassword':
        return (
          <ForgotPasswordScreen
            onBack={() => goBackOr('SignIn')}
            initialEmail={recoveryEmail || undefined}
            initialPhoneE164={recoveryPhone || undefined}
            // Straight to sign-in with the address prefilled: the password they
            // just set is the one they need next, and sending them to Home
            // would skip the login the reset just invalidated.
            onDone={() => {
              setUserEmail(recoveryEmail);
              navigate('SignIn', { reset: true });
            }}
          />
        );

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
            onBack={onboardingBack('WhoIsFor')}
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
            dependentName={dependentName || undefined}
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
            resendCooldownFrom={waliResendFrom}
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
                // A fresh timestamp on every accepted send, so the screen
                // restarts its cooldown for resends too.
                setWaliResendFrom(Date.now());
              } catch (e: any) {
                const msg: string = (e?.message ?? '').toLowerCase();
                const rateLimited =
                  msg.includes('rate') || msg.includes('many') || msg.includes('429');
                setWaliEmailError(
                  rateLimited
                    ? 'Too many requests. Please wait a minute and try again.'
                    : 'Could not send the code. Please try again.',
                );
                // Being told to wait is itself a reason to start the timer.
                // Without this the link came straight back and the next tap
                // simply earned the same refusal.
                if (rateLimited) setWaliResendFrom(Date.now());
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
            dependentName={dependentName || undefined}
            onBack={onboardingBack('WaliCode')}
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
            dependentName={dependentName || undefined}
            onGoHome={() => { setOnboardingComplete(true); navigate('Home'); }}
            onSeeDependent={() => { setOnboardingComplete(true); navigate('Home'); }}
          />
        );

      // ── F6: Country ───────────────────────────────────────────────────────────
      case 'F6':
        return (
          <CountryScreen
            // Entered from Home to finish a profile → an X back to Home.
            // Reached during signup there is nowhere to return to, so the only
            // exit is to abandon the account.
            {...onboardingExit()}
            onLocationDetected={coords => setLocationCoords(coords)}
            onContinue={c => {
              setCountry(c);
              // Persisted here rather than carried in memory to F8. The endpoint
              // takes the country on its own, so quitting after this step no
              // longer loses the answer — and the button now has a real request
              // to show its loader for.
              saveThenAdvance(
                () => updateLocation({ countryCode: c.iso2 }),
                'F7',
              );
            }}
            continueLoading={continueBusy}
          />
        );

      // ── F7: City ──────────────────────────────────────────────────────────────
      case 'F7':
        return (
          <CityScreen
            countryCode={country.iso2}
            {...onboardingExit()}
            countryName={country.name}
            initialCoords={locationCoords ?? undefined}
            onBack={onboardingBack('F6')}
            onContinue={(city, coords) => {
              setObCity(city);
              // The city goes with the coordinates now. It used to be dropped
              // here and only reached the server at F8, and the coordinates
              // were sent fire-and-forget, so the button showed no loader and a
              // failure went unmentioned.
              saveThenAdvance(
                () =>
                  updateLocation({
                    city,
                    countryCode: country.iso2,
                    ...(coords?.latitude != null && coords?.longitude != null
                      ? { latitude: coords.latitude, longitude: coords.longitude }
                      : {}),
                  }),
                'F8',
              );
            }}
            continueLoading={continueBusy}
          />
        );

      // ── F8: Essentials ────────────────────────────────────────────────────────
      case 'F8':
        return (
          <EssentialsScreen
            onBack={onboardingBack('F7')}
            {...onboardingExit()}
            accountEmail={userEmail || undefined}
            onContinue={data => {
              setObSect(data.sect);
              setObMarital(data.maritalStatus);
              setUserName(data.name.split(' ')[0]);
              saveThenAdvance(async () => {
                await updateEssentials({
                  // Overwrites the placeholder registration derived from the
                  // email address; this is the first time a real name is known.
                  fullName: data.name,
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
            onBack={onboardingBack('F8')}
            {...onboardingExit()}
            onContinue={() => navigateForward('F11')}
            continueLoading={continueBusy}
          />
        );

      // ── F11: Family & Home ────────────────────────────────────────────────────
      case 'F11':
        return (
          <FamilyAndHomeScreen
            onBack={onboardingBack('F10')}
            {...onboardingExit()}
            onContinue={data => saveThenAdvance(() => updateFamilyBackground(data), 'F12')}
            continueLoading={continueBusy}
          />
        );

      // ── F12: Guided Prompt ────────────────────────────────────────────────────
      case 'F12':
        return (
          <GuidedPromptScreen
            onBack={onboardingBack('F11')}
            {...onboardingExit()}
            onNext={text => saveThenAdvance(() => updatePrompts({ familyDescription: text }), 'F13')}
            progress={0.72}
            continueLoading={continueBusy}
          />
        );

      // ── F13: Preferences ─────────────────────────────────────────────────────
      case 'F13': {
        // Only the city is seeded here. Everything else the form shows is read
        // from the stored preference by the screen itself, so a relaunch cannot
        // show one thing while the server filters by another.
        //
        // The seed is a suggestion the user can see and untick, not a silent
        // one: `preferredCities` is a hard filter, so the city they just gave
        // is the only city it is honest to preselect on their behalf.
        const prefSeed: Partial<PreferenceValues> = {};
        if (obCity) { prefSeed.cities = [obCity]; }
        return (
          <PreferencesScreen
            initialValues={prefSeed}
            {...onboardingExit()}
            onContinue={values => {
              // What is answered here *is* the user's partner preference set:
              // it becomes the defaults PartnerPreferencesScreen opens on and
              // AdjustFiltersScreen inherits, exactly as saving from the
              // settings screen does.
              setObAgeMin(values.ageMin);
              setObAgeMax(values.ageMax);
              setObSect(values.sects.includes('Any') ? '' : (values.sects[0] ?? ''));
              setObMarital(
                values.maritalStatuses.includes('Any') ? '' : (values.maritalStatuses[0] ?? ''),
              );
              setPreferenceFilters(values);
              setAppliedFilters(undefined);
              // The whole set goes to the server, cities included. "Include
              // overseas" is the exception: it would have to become
              // `countryCodes` and there is no country shortlist here to turn a
              // switch into, so it stays in app state.
              saveThenAdvance(() => updatePreferences(preferencesToApi(values)), 'F14');
            }}
            continueLoading={continueBusy}
          />
        );
      }

      // ── F14: Photos ───────────────────────────────────────────────────────────
      case 'F14':
        return (
          <PhotosScreen
            onBack={onboardingBack('F13')}
            {...onboardingExit()}
            onContinue={() => navigateForward('F16')}
            continueLoading={continueBusy}
          />
        );

      // ── F15: Wali Invite ──────────────────────────────────────────────────────
      // Not an onboarding step. F14 continues straight to F16 and a saved F15
      // resumes at F16 (SKIP_PAST), so nothing routes through here: it is a
      // standalone screen opened from Home, and it closes back to Home.
      case 'F15':
        return <WaliInviteScreen onClose={() => navigate('Home')} />;

      // ── F16: Verification ─────────────────────────────────────────────────────
      case 'F16':
        return (
          <VerificationScreen
            faceDone={faceDone}
            {...onboardingExit()}
            cnicDone={cnicDone}
            faceFailed={faceFailed}
            cnicFailed={cnicFailed}
            faceAttemptsLeft={faceAttemptsLeft}
            onBack={verifyFromHome ? undefined : onboardingBack('F14')}
            onScanFace={async () => {
              // Really submitted, not simulated. This screen used to fake a
              // failure on the first tap and a success on retry without ever
              // calling the API, so no Verification row was created — the table
              // was empty for every user, and the home screen's "under review"
              // was reporting a review that did not exist.
              try {
                await submitFaceVerification();
                setFaceFailed(false);
                setFaceDone(true);
              } catch {
                setFaceAttempts(prev => Math.max(0, prev - 1));
                setFaceFailed(true);
              }
            }}
            onAddId={async () => {
              try {
                await submitCnicVerification();
                setCnicFailed(false);
                setCnicDone(true);
              } catch {
                setCnicFailed(true);
              }
            }}
            onDismissFailed={() => {
              // Back from H3/H4 → return to normal F16 view
              setFaceFailed(false);
              setCnicFailed(false);
            }}
            onRetryFace={async () => {
              try {
                await submitFaceVerification();
                setFaceFailed(false);
                setFaceDone(true);
              } catch {
                setFaceAttempts(prev => Math.max(0, prev - 1));
              }
            }}
            onUploadCnic={async () => {
              try {
                await submitCnicVerification();
                setCnicFailed(false);
                setCnicDone(true);
              } catch {
                setCnicFailed(true);
              }
            }}
            onContinue={() => {
              setVerificationSubmittedAt(new Date());
              // Opened from Home, so this is a standalone trip: go back where
              // it started. Continuing into F17 would put an already-paid user
              // in front of the payment screen again, and would rewrite their
              // saved onboarding step backwards.
              if (verifyFromHome) {
                setVerifyFromHome(false);
                navigate('Home');
                return;
              }
              // Save F17 to DB so F16 is never re-shown on restart
              // (handles both "Continue" and "Skip for now" paths).
              const n = stepNumberFor('F17');
              if (n != null) saveOnboardingStep(n).catch(() => {});
              setResumeScreen('F17');
              navigate('F17');
            }}
          />
        );

      // ── F17: Payment ──────────────────────────────────────────────────────────
      case 'F17':
        return (
          <PaymentScreen
            paying={paying}
            error={payError}
            priceLabel={storePrice}
            // The server's own count, so the heading claims a real number or
            // none. It was the hardcoded string "142 people".
            matchCount={matchCount}
            {...onboardingExit()}
            onBack={onboardingBack('F16')}
            onPay={async () => {
              setPaying(true);
              setPayError(undefined);
              // Keeps the foreground restore pass off this purchase. Play's
              // sheet backgrounds the app, which fires that listener while this
              // handler still holds the token.
              payInFlight.current = true;
              try {
                // Google Play is the only store with a verifier server-side, so
                // nothing else can complete a purchase yet.
                //
                // This used to set `paymentFailed` and send the user to Home,
                // where the payment-failed card asked them to retry a payment
                // and check their card — for a purchase that was never
                // attempted and cannot be on this platform. The screen says so
                // instead, in place, and leaves them where they are.
                if (!STORE_PURCHASES_SUPPORTED) {
                  setPayError(
                    'Membership cannot be purchased on this device yet. ' +
                      'It is available in the Android app.',
                  );
                  return;
                }

                // Play's own purchase sheet. The token it returns is the only
                // thing the server will accept — it calls Google to check it,
                // so there is nothing to fake here and nothing to gain by it.
                const purchase = await buyMembership(userId);
                await activateMembership(purchase);
              } catch (err) {
                // Backing out of Play's sheet is not a failure. Leave the
                // paywall exactly as it was — no error, no navigation.
                if (isUserCancelled(err)) return;

                // Play refuses a second purchase of something this account owns.
                // It means the user has already paid and the purchase was never
                // finished, so the answer is to redeem it — telling them to buy
                // again would offer the one button that cannot work.
                if (isAlreadyOwned(err)) {
                  const restored = await redeemUnfinishedPurchase();
                  if (restored) return;
                  setPayError(
                    'You have already paid for this. Reopen the app in a moment ' +
                      'and your membership will be restored.',
                  );
                  return;
                }

                // The purchase may well have succeeded and only the verify call
                // failed, in which case Google is still holding the token and
                // the restore pass on next foreground recovers it. So say the
                // membership did not activate, never that the payment failed.
                //
                // Both of these carry a message written for the user: ApiError
                // one the server meant for them, StoreError one `iap.ts` worked
                // out from the store's own code. Only the third case is a
                // library string or a developer guard, which must not be shown.
                //
                // The generic sentence used to answer for all three, which is
                // how a payment still being processed, and one that may already
                // have been charged, were both reported as "try again" — the
                // one instruction that risks paying twice.
                setPayError(
                  err instanceof ApiError
                    ? err.message
                    : isStoreError(err)
                      ? err.userMessage
                      : 'The membership did not activate. If you were charged, ' +
                        'reopen the app in a moment and it will be restored.',
                );
              } finally {
                payInFlight.current = false;
                setPaying(false);
              }
            }}
            onSkip={() => {
              // Same as the paid path: which card Home shows is the server's
              // answer, not a guess made here.
              setHomeStateLoaded(false);
              refreshHomeState().catch(() => {});
              const n = stepNumberFor('F18');
              if (n != null) saveOnboardingStep(n).catch(() => {});
              navigate('F18');
            }}
            // The membership screen is the page that answers this.
            onWhatDoIGet={() => navigate('Membership')}
          />
        );

      // ── F18: Done ─────────────────────────────────────────────────────────────
      case 'F18':
        return (
          <DoneScreen
            waliName={waliName}
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
            // `preferenceFilters` is Partial, and this screen renders every
            // row — so the gaps are filled rather than cast away, which is
            // what would have rendered "undefined–undefined" for the age range.
            // This screen renders every row, so a Partial has to be completed
            // first — otherwise the age range prints "undefined–undefined".
            // Filled from the filter screen's own defaults, not a local copy.
            filters={
              appliedFilters ??
              (preferenceFilters
                ? { ...BASE_DEFAULTS, ...preferenceFilters }
                : onboardingFilters)
            }
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
            onSearchNearby={() => { setH11FromHome(false); navigate('Filters'); }}
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
                // Withdrawn proposals do not hide anyone. The row survives a
                // withdrawal — the server sets its stage rather than deleting
                // it — so counting every proposal here kept the recipient out of
                // the feed for good, which is exactly what withdrawing is meant
                // to undo. The server's own discovery query makes the same
                // exception.
                const proposedIds = new Set([
                  ...localWardProposals
                    .filter(p => p.stage !== 'WITHDRAWN')
                    .map(p => p.toUserId),
                  ...wardProposals
                    .filter(p => p.stage !== 'WITHDRAWN')
                    .map(p => p.toUserId),
                ]);
                return !proposedIds.has(i.userId);
              })}
              wardProposals={[
                ...localWardProposals.filter(l => !wardProposals.some(s => s.toUserId === l.toUserId)),
                ...wardProposals,
              ]}
              wardReceivedProposals={wardReceivedProposals}
              onPhotoRequests={() => navigate('PhotoRequests')}
              photoRequestsBadge={waliPhotoRequestsBadge}
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
                      photosWithheld: intro.photosWithheld,
                      photoRequestStatus: intro.photoRequestStatus ?? null,
                      photoRequestWaitingOn: intro.photoRequestWaitingOn ?? null,
                      hideDistance: intro.hideDistance,
                      distanceKm: intro.distanceKm,
                      gender: intro.gender,
                      heightCm: intro.heightCm,
                      maritalStatus: intro.maritalStatus,
                      hasChildren: intro.hasChildren,
                      willingToRelocate: intro.willingToRelocate,
                      sect: intro.sect,
                      madhhab: intro.madhhab,
                      religiosity: intro.religiosityLevel,
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
                  // The proposal is the ward's, so a withdraw before the next
                  // refresh still knows whose it is.
                  seekerUserId: dependentProfile?.userId ?? '',
                  toUserId: userId,
                  recipientName: intro?.fullName ?? null,
                  recipientAge: intro?.age ?? null,
                  recipientCity: intro?.city ?? null,
                  recipientOccupation: intro?.occupation ?? null,
                  // Optimistic placeholder; the server returns the real stage on
                  // refresh. HER_WALI_REVIEWING, not HIS_WALI_PENDING: the wali
                  // is the sender here, so his own approval is already given —
                  // the old value put his proposal straight into his own
                  // "needs your review" queue until the next fetch.
                  stage: 'HER_WALI_REVIEWING',
                  sentByWali: true,
                  createdAt: new Date().toISOString(),
                };
                // Wait for the API before removing from intro feed — keeps the
                // modal mounted with its loader visible while the request is in-flight.
                // The ward is the sender, so their id is the second argument.
                // It used to be called as `(userId, note)` — the note string
                // landed in the `seekerUserId` slot and went to the server as
                // the ward's id, which it rejected as "must be a UUID".
                if (!dependentProfile?.userId) return;
                await sendWardProposal(userId, dependentProfile.userId, note)
                  .catch(() => {});
                // Optimistic updates — the proposals:stale broadcast will trigger
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
              // Refetch everything: the withdrawn proposal leaves the Sent
              // list and its recipient returns to the introductions feed.
              onProposalWithdrawn={() => { loadWaliProfile().catch(() => {}); }}
              // The guardian's own review step. These two API functions
              // had no caller anywhere before this, so the stage the whole
              // pipeline waits on could be read but never actioned.
              onApproveReceived={async (proposalId) => {
                setWaliLoading(true);
                try {
                  await approveProposal(proposalId);
                } catch { /* the refetch below shows the unchanged state */ }
                await loadWaliProfile().catch(() => {});
                setWaliLoading(false);
              }}
              onDeclineReceived={async (proposalId) => {
                setWaliLoading(true);
                try {
                  await declineProposal(proposalId);
                } catch { /* as above */ }
                await loadWaliProfile().catch(() => {});
                setWaliLoading(false);
              }}
              wardFilters={wardFilters}
              onApplyWardFilters={filters => {
                setWardFilters(filters);
                // The ref is what `loadWaliProfile` reads, and state has not
                // committed yet at this point.
                wardFiltersRef.current = filters;
                setWaliLoading(true);
                loadWaliProfile()
                  .catch(() => {})
                  .finally(() => setWaliLoading(false));
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
                  photosWithheld: false,
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
            userId={userId}
            onPhotoRequests={() => navigate('PhotoRequests')}
            photoRequestsBadge={photoRequestsBadge}
            onOpenNotifications={() => navigate('NotificationFeed')}
            notificationsBadge={notificationsBadge}
            userName={userName}
            paymentFailed={paymentFailed}
            faceFailed={faceFailed}
            cnicFailed={cnicFailed}
            faceAttemptsLeft={faceAttemptsLeft}
            homeStateLoaded={homeStateLoaded}
            underReviewUnpaid={underReviewUnpaid}
            underReviewPaid={underReviewPaid}
            proposalsReadyUnpaid={proposalsReadyUnpaid}
            verificationApproved={verificationApproved}
            priceLabel={storePrice}
            matchCount={matchCount}
            introductionAvailable={introductionAvailable}
            hasIntroductions={hasIntroductions}
            // `undefined`, not '', so the block's own "your city" wording
            // stands in when the profile has no city.
            introductionCity={introductionCity || undefined}
            introductionProfile={introductionProfile}
            matchCriteria={matchCriteria}
            reviewedThisWeek={reviewedThisWeek}
            introductionIndex={introductionIndex}
            totalIntroductions={totalIntroductions ?? undefined}
            userCoords={userCoords ?? undefined}
            profileIncomplete={
              !isWali && (!onboardingComplete || serverProfileIncomplete)
            }
            resumeScreen={resumeScreen}
            onNotSuitable={() => {
              if (!currentIntroductionId) return;
              skipIntroduction(currentIntroductionId).catch(() => {});
              setMatchCriteria(c => Math.max(0, c - 1));
              setIntroductionIndex(i => i + 1);
              loadNextIntroduction();
            }}
            // The recipient's own decision at the last gate. Accepting is what
            // creates the match and opens the conversation; both refresh the
            // home state so the proposals badge and feed settle.
            onAcceptProposal={async (fromUserId) => {
              try {
                await acceptProposal(fromUserId);
              } catch (err: any) {
                Alert.alert('Could not accept', saveFailedMessage(err));
              }
              setProposalsRefreshKey(k => k + 1);
              await refreshHomeState().catch(() => {});
              loadNextIntroduction().catch(() => {});
            }}
            onDeclineProposal={async (fromUserId) => {
              try {
                await declineReceivedProposal(fromUserId);
              } catch (err: any) {
                Alert.alert('Could not decline', saveFailedMessage(err));
              }
              setProposalsRefreshKey(k => k + 1);
              await refreshHomeState().catch(() => {});
            }}
            onOpenProposalChat={(matchId) => {
              // Same lookup the profile screen uses: the thread is addressed by
              // its conversation id, which the chats list maps from the match.
              const chat = matchId ? chats.find(c => c.matchId === matchId) : undefined;
              if (chat) {
                setActiveChatId(chat.id);
                navigate('ChatThread');
                return;
              }
              // The match was created moments ago and this list has not caught
              // up. The Chats tab loads it fresh.
              setActiveTab('chats');
              navigate('Home');
            }}
            onProposalWithdrawn={() => {
              // The proposal is withdrawn, so the person re-enters the pool —
              // discovery excludes every interest stage except WITHDRAWN.
              // Reload the introduction card so the home feed reflects it.
              loadNextIntroduction().catch(() => {});
            }}
            onViewProposalProfile={openCounterpartProfile}
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
                    photosWithheld: intro.photosWithheld,
                    photoRequestStatus: intro.photoRequestStatus ?? null,
                    photoRequestWaitingOn: intro.photoRequestWaitingOn ?? null,
                    hideDistance: intro.hideDistance,
                    distanceKm: intro.distanceKm,
                    gender: intro.gender,
                    heightCm: intro.heightCm,
                    maritalStatus: intro.maritalStatus,
                    hasChildren: intro.hasChildren,
                    willingToRelocate: intro.willingToRelocate,
                    sect: intro.sect,
                    madhhab: intro.madhhab,
                    religiosity: intro.religiosityLevel,
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
              // stats:stale broadcast will trigger the refresh automatically
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
            onAskWaliAgain={() => navigate('YourWali')}
            onChooseAnotherWali={() => navigate('F15')}
            onReviewProposal={() => { setActiveTab('proposals'); navigate('Home'); }}
            onSwitchToProfile={() => setActiveTab('home')}
            onRefresh={async () => {
              await Promise.all([
                loadNextIntroduction(),
                getHomeStats(sessionFiltersRef.current)
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
            profileCompletion={profileCompletion}
            profileCompletionLoading={profileCompletionLoading}
            onContinueOnboarding={target =>
              navigate(target ? (target as Screen) : resumeScreen)
            }
            onBecomeAMember={() => {
              // Leaving for the payment screen. The card to show on return is
              // the server's answer either way — including when the payment is
              // abandoned — so the state is marked unloaded rather than cleared
              // to a guess about what comes next.
              setHomeStateLoaded(false);
              navigate('F17');
            }}
            waliRequired={waliRequired}
            isPaidMember={isPaidMember}
            // F15 is the wali invite step, the same screen onboarding uses.
            onAddWali={() => navigate('F15')}
            onImproveBiodata={() => navigate('F8')}
            onReviewPreferences={() => navigate('F13')}
            verificationSubmittedAt={verificationSubmittedAt}
            verificationPending={verificationPending}
            verificationPartial={verificationPartial}
            onStartVerification={() => {
              setVerifyFromHome(true);
              navigate('F16');
            }}
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
            // Everything awaiting an answer, in one number: received
            // proposals plus photo requests. Summed here so neither source has
            // to know about the other.
            proposalsBadge={proposalsBadge + photoRequestsBadge}
            // Conversations holding something unread. Derived from the chat
            // list already in state rather than tracked separately, so it
            // cannot drift from what the Chats tab actually shows.
            chatsBadge={chats.filter(c => (c.unreadCount ?? 0) > 0).length}
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
            onBack={() => {
              setViewingDependent(false);
              setProfileProposalContext('none');
              setProfileMatchId(null);
              // Was hardcoded to Home, so opening a profile from a chat thread
              // or a proposal and pressing back dropped the user on Home with
              // the thread they were reading gone.
              goBackOr('Home');
            }}
            onNotSuitable={() => { setProfileProposalContext('none'); navigate('Home'); }}
            // Actually sends it now. This was `console.log`, so the screen
            // showed "Photo request sent" for a request that never left the app.
            onRequestPhoto={async () => {
              const target = detailProfile?.userId;
              if (!target) throw new Error('Could not tell whose photos to ask for.');
              // A guardian asks for their ward, not for themselves: the request
              // belongs to the ward, and the recipient must see the seeker.
              const forWard = isWali ? dependentProfile?.userId : undefined;
              if (isWali && !forWard) {
                throw new Error('No linked dependent to request photos for.');
              }
              await requestPhoto(target, forWard);
            }}
            // The same call the introduction card makes; this site was a stub,
            // so "Send proposal" from a profile opened this way did nothing.
            onSendProposal={async (note) => {
              const target = detailProfile?.userId;
              if (!target) return;
              await sendProposal(target, note).catch(() => {});
              navigate('Home');
            }}
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
      case 'NotificationFeed':
        return (
          <NotificationFeedScreen
            onBack={() => goBackOr('Home')}
            userId={userId}
            // The bell badge lives in App, so the screen reports read-state
            // changes rather than owning a second copy of the count.
            onReadStateChange={refreshNotificationCount}
            onOpen={openNotification}
          />
        );

      case 'PhotoRequests':
        return (
          // Back through history: reached from the Proposals header today, but
          // a hardcoded destination is what put the profile screen wrong.
          <PhotoRequestsScreen
            onBack={() => goBackOr('Home')}
            onOpenPrivacy={() => navigate('Privacy')}
          />
        );

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
            // Passed explicitly, not spread: a conditional `{...}` spread
            // silences excess-property checks, which is how two screens in this
            // file were once handed props they did not accept.
            // Undefined when the partner is unknown — the button hides itself.
            onViewProfile={
              activeChatPartner
                ? () =>
                    openCounterpartProfile(
                      activeChatPartner.userId,
                      'received',
                      activeChatPartner.matchId,
                    )
                : undefined
            }
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
                updated.sort(byNewestMessage);
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
                await signOutAndClearCaches();
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
            />
          );
        }
        return (
          <SettingsScreen
            // No `userName`: this screen wants the full name, and `userName` is
            // only the first. It reads the profile itself.
            verified={verificationApproved}
            matchCount={matchCount}
            isPaidMember={isPaidMember}
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
            onSignOut={async () => {
              await signOutAndClearCaches();
              applyRole('self');
              setUserId('');
              navigate('F1');
            }}
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
            // F12 is the photo step; it owns the picker and the upload.
            onAddPhoto={() => navigate('F12')}
          />
        );

      // ── Membership: M4 ───────────────────────────────────────────────────
      case 'Membership':
        return (
          <MembershipScreen
            onBack={() => navigate('Settings')}
            // The store's price, so this page and the paywall that links to it
            // cannot quote different numbers.
            priceLabel={storePrice}
            // No receipt endpoint exists, so this control is not offered
            // rather than shown and doing nothing. Support handles receipts.
            onRequestRefund={async () => {
              try {
                await requestRefund();
                setRefundNotice('Refund request sent. Support will be in touch.');
              } catch (e: any) {
                setRefundNotice(e?.message ?? 'Could not send the request. Please try again.');
              }
            }}
            refundNotice={refundNotice}
            onReadRefundPolicy={() => navigate('RefundPolicy')}
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

      // ── PartnerPreferences ────────────────────────────────────────────────
      case 'PartnerPreferences':
        return (
          <PartnerPreferencesScreen
            onBack={() => navigate('Settings')}
            onSave={(values) => {
              const { sects, maritalStatuses } = values;
              setObSect(sects.includes('Any') ? '' : (sects[0] ?? ''));
              setObMarital(maritalStatuses.includes('Any') ? '' : (maritalStatuses[0] ?? ''));
              // A session filter is an override of the stored preference, so
              // changing the preference retires it — otherwise the new
              // preference would be saved and then immediately overruled by a
              // filter the user set against the old one.
              setAppliedFilters(undefined);
              // Re-read rather than trusting the values just submitted: the
              // server is what the feed is filtered by, and it normalises (an
              // "Any" chip becomes an empty list, an unmapped enum is dropped).
              // Reading it back means the filter screens show what will actually
              // be applied.
              loadStoredPreferences();
            }}
          />
        );

      case 'YourWali':
        return (
          <FamilyScreen
            onBack={() => navigate('Settings')}
            // "Ask again" and "Review proposal" both mean going to the wali
            // screen that actually shows the state — they were console.log
            // stubs, which looked wired and did nothing.
            onAskWaliAgain={() => navigate('YourWali')}
            onChooseAnotherWali={() => navigate('F15')}
            onReviewProposal={() => { setActiveTab('proposals'); navigate('Home'); }}
            onSwitchToProfile={() => navigate('Home')}
          />
        );

      default:
        return null;
    }
  }

  /**
   * Continues the native splash while the session-restore check runs.
   *
   * This used to be a bare `<View style={styles.root} />` — and `root` sets
   * only `flex: 1`, so it rendered default white. The launch window was
   * branded, the first screen is `#F6F5FA`, and this sat between them as a
   * white flash for however long the restore took.
   *
   * Same colour and same centred mark as the splash, so the handover from the
   * native window to JS is invisible rather than a blank gap.
   */
  if (!appReady) {
    return (
      <SafeAreaProvider initialMetrics={INITIAL_SAFE_AREA_METRICS ?? undefined}>
        <View style={styles.boot}>
          <Image source={LOGO_SOURCE} style={styles.bootLogo} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={INITIAL_SAFE_AREA_METRICS ?? undefined}>
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
  // Matches the splash exactly: same ground, same logo size and position.
  boot: {
    flex: 1,
    backgroundColor: '#F6F5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 140, matching the native splash mark exactly so the handover from
  // the launch window to JS shows no change in size.
  bootLogo: { width: 140, height: 140, resizeMode: 'contain' },
});
