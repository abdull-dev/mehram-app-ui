import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { getMe, saveOnboardingStep } from './src/api/auth';
import { verifyPurchase, getEntitlement } from './src/api/billing';
import { getIntroductions, getIntroduction, getHomeStats, skipIntroduction, type Introduction, type FullIntroduction, type IntroductionFilters } from './src/api/introductions';
import { sendProposal, getProposalStats } from './src/api/proposals';
import {
  updateBio,
  updateLocation,
  updateEssentials,
  updateSect,
  updateFamilyBackground,
  updatePreferences,
  toGender,
  toMaritalStatus,
  toSect,
  parseDob,
} from './src/api/profile';
import { type IntroductionProfile } from './src/components/introduction/IntroductionAvailableBlock';
import { getAccessToken, getPendingEmail, getPendingPhone, savePendingEmail, savePendingPhone, clearTokens } from './src/storage/authStorage';
import { useHomeSocket } from './src/hooks/useHomeSocket';
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
import { ProfileDetailScreen } from './src/screens/profile/ProfileDetailScreen';
import { AccountVerificationScreen } from './src/screens/onboarding/AccountVerificationScreen';
import { SignInScreen } from './src/screens/onboarding/SignInScreen';
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
import { WaliRoleExplainScreen }  from './src/screens/wali-onboarding/WaliRoleExplainScreen';
import { WaliDetailsScreen }      from './src/screens/wali-onboarding/WaliDetailsScreen';
import { WaliSetupCompleteScreen } from './src/screens/wali-onboarding/WaliSetupCompleteScreen';

// ─── screen order (used to determine slide direction) ────────────────────────
type Screen =
  | 'F1' | 'SignIn' | 'WhoIsFor' | 'Phone' | 'AccountVerification' | 'Code'
  | 'F6' | 'F7' | 'F8' | 'F10'
  | 'F11' | 'F12' | 'F13' | 'F14' | 'F15' | 'F16' | 'F17' | 'F18'
  | 'F21' | 'F22' | 'H11' | 'Filters' | 'Home' | 'ProfileDetail'
  | 'Settings' | 'Privacy' | 'YourPhotos' | 'Membership' | 'DeleteAccount' | 'EditProfile'
  | 'Notifications' | 'Language' | 'BlockedPeople' | 'ContactSupport'
  | 'PrivacyPolicy' | 'TermsOfService' | 'RefundPolicy'
  | 'FoundMyMatch' | 'DownloadData' | 'PartnerPreferences' | 'YourWali'
  // Wali onboarding
  | 'WaliAccountSetup' | 'WaliWelcome' | 'WaliCode' | 'WaliRole' | 'WaliDetails' | 'WaliComplete';

const SCREEN_ORDER: Screen[] = [
  // Onboarding
  'F1', 'SignIn', 'WhoIsFor',
  // Wali onboarding branch (sits between WhoIsFor and Phone)
  'WaliAccountSetup', 'WaliWelcome', 'WaliCode', 'WaliRole', 'WaliDetails', 'WaliComplete',
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
  // Candidate count shown on H12 — populated from GET /proposals/stats.
  const [matchCount, setMatchCount] = useState(0);
  // H16 hero stats — populated from GET /introductions/stats.
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
  const [stepSaving, setStepSaving] = useState(false);
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

  const captureAndStoreLocation = useCallback(async () => {
    const coords = await captureCurrentLocation();
    if (coords) setUserCoords(coords);
  }, []);

  // Load (or reload) today's next introduction and update card state.
  // On the very first call fetches up to 50 to record the total count for
  // the "X of Y" label; subsequent calls fetch 1 at a time.
  const loadNextIntroduction = useCallback((): Promise<void> => {
    const limit = isFirstIntroLoad.current ? 50 : 1;
    return getIntroductions(limit, activeFiltersRef.current)
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
      });
  }, []);

  // Trigger initial load when the user reaches H16 (paid + active).
  useEffect(() => {
    if (!introductionAvailable) return;
    loadNextIntroduction();
    getHomeStats(activeFiltersRef.current)
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
    getHomeStats(activeFiltersRef.current)
      .then(stats => {
        setMatchCriteria(stats.matchCriteria);
        setReviewedThisWeek(stats.reviewedThisWeek);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, preferenceFilters]);

  // Re-fetch stats whenever the server signals a change via socket.
  useHomeSocket(() => {
    if (!introductionAvailable) return;
    getHomeStats(activeFiltersRef.current)
      .then(stats => {
        setMatchCriteria(stats.matchCriteria);
        setReviewedThisWeek(stats.reviewedThisWeek);
      })
      .catch(() => {});
  });

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

      // Determine which HomeScreen state to show based on entitlement + pool size.
      // Called whenever a fully-onboarded user opens the app.
      //   isEntitled = true  → H16: paid, show today's introductions
      //   isEntitled = false, candidateCount > 0 → H12: candidates waiting, prompt to pay
      //   isEntitled = false, candidateCount = 0 → H8: profile under review, no pool yet
      async function resolveHomeState() {
        try {
          // __DEV__ is true in Metro/debug builds, false in production releases.
          // Keeps dev always on H16 without touching the payment flow.
          const { isEntitled } = __DEV__ ? { isEntitled: true } : await getEntitlement();
          if (isEntitled) {
            setIntroductionAvailable(true); // loadNextIntroduction() fires via useEffect
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
          // Network failure — safest fallback: show H8 (under review).
          setUnderReviewUnpaid(true);
        }
      }

      getMe()
        .then(async me => {
          setUserName(me.profile.fullName?.split(' ')[0] ?? '');

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
            await resolveHomeState();
            setScreen('Home');
          } else if (me.profile.onboardingStep) {
            const step = me.profile.onboardingStep as Screen;

            // F17 (payment) and F18 (done) mean the user finished all
            // onboarding sections — determine the right home state via API.
            if (step === 'F17' || step === 'F18') {
              setOnboardingComplete(true);
              await resolveHomeState();
              setScreen('Home');
              return;
            }

            // Skippable steps that sit before payment — advance past them
            // so the screen is never shown again on restart.
            const SKIP_TO_NEXT: Partial<Record<Screen, Screen>> = {
              F15: 'F16', // Wali invite → verification
              F16: 'F17', // Verification → payment (handled above)
            };
            const resumeTarget = SKIP_TO_NEXT[step] ?? step;
            setResumeScreen(resumeTarget);
            if (allSectionsDone(resumeTarget)) {
              // All profile sections complete — resume at the target step.
              setScreen(resumeTarget);
            } else {
              // Profile still incomplete — Home shows H6.
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

  function navigate(to: Screen) {
    directionRef.current = navDirection(screen, to);
    setScreen(to);
  }

  // Used for forward onboarding navigation — saves the step to DB before transitioning.
  async function navigateForward(to: Screen) {
    directionRef.current = 'forward';
    const shouldSave =
      SCREEN_ORDER.includes(to) &&
      to !== 'F1' && to !== 'SignIn' && to !== 'Code' && to !== 'AccountVerification';
    if (shouldSave) {
      setStepSaving(true);
      try {
        await saveOnboardingStep(to);
        setResumeScreen(to);
      } catch {
        // non-blocking — continue navigation regardless
      } finally {
        setStepSaving(false);
      }
    }
    setScreen(to);
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
            onSignIn={() => navigate('SignIn')}
          />
        );

      // ── SignIn ────────────────────────────────────────────────────────────────
      case 'SignIn':
        return (
          <SignInScreen
            onBack={() => navigate('F1')}
            onSignIn={(_email, _password, emailVerified) => {
              // If email is not verified, redirect to AccountVerification immediately.
              if (!emailVerified && _email) {
                setUserEmail(_email);
                setPendingEmail(_email);
                savePendingEmail(_email).catch(() => {});
                navigate('AccountVerification');
                return;
              }
              // login() already saved tokens; check onboarding status
              getMe()
                .then(me => {
                  setUserName(me.profile.fullName?.split(' ')[0] ?? '');
                  if (me.profile.onboardingCompleted) {
                    setOnboardingComplete(true);
                    setIntroductionAvailable(true);
                    setHasIntroductions(true);
                    navigate('Home');
                  } else if (me.profile.onboardingStep) {
                    const step = me.profile.onboardingStep as Screen;
                    if (step === 'F17' || step === 'F18') {
                      setOnboardingComplete(true);
                      setIntroductionAvailable(true);
                      setHasIntroductions(true);
                      navigate('Home');
                    } else {
                      const SKIP_TO_NEXT: Partial<Record<Screen, Screen>> = {
                        F15: 'F16',
                        F16: 'F17',
                      };
                      const resumeTarget = SKIP_TO_NEXT[step] ?? step;
                      setResumeScreen(resumeTarget);
                      if (allSectionsDone(resumeTarget)) {
                        navigate(resumeTarget);
                      } else {
                        navigate('Home');
                      }
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
              // After verification, determine where to resume based on the user's state.
              getMe()
                .then(me => {
                  setUserName(me.profile.fullName?.split(' ')[0] ?? '');
                  if (me.profile.onboardingCompleted) {
                    setOnboardingComplete(true);
                    setIntroductionAvailable(true);
                    setHasIntroductions(true);
                    navigate('Home');
                  } else if (me.profile.onboardingStep) {
                    const step = me.profile.onboardingStep as Screen;
                    if (step === 'F17' || step === 'F18') {
                      setOnboardingComplete(true);
                      setIntroductionAvailable(true);
                      setHasIntroductions(true);
                      navigate('Home');
                    } else {
                      const SKIP_TO_NEXT: Partial<Record<Screen, Screen>> = { F15: 'F16', F16: 'F17' };
                      const target = SKIP_TO_NEXT[step] ?? step;
                      setResumeScreen(target);
                      navigate(allSectionsDone(target) ? target : 'Home');
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
              setSelectedRole(selection);
              if (selection === 'wali') {
                navigate('WaliAccountSetup');
              } else {
                navigate('Phone');
              }
            }}
          />
        );

      // ── Wali onboarding ───────────────────────────────────────────────────────
      case 'WaliAccountSetup':
        return (
          <WaliAccountSetupScreen
            onBack={() => navigate('WhoIsFor')}
            onContinue={(_email, _password) => navigate('WaliCode')}
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
            onBack={() => navigate('WaliWelcome')}
            onContinue={_code => navigate('WaliRole')}
            onUseLink={() => navigate('WaliRole')}
          />
        );

      case 'WaliRole':
        return (
          <WaliRoleExplainScreen
            onBack={() => navigate('WaliCode')}
            onAccept={() => navigate('WaliDetails')}
            onDecline={() => navigate('WhoIsFor')}
          />
        );

      case 'WaliDetails':
        return (
          <WaliDetailsScreen
            onBack={() => navigate('WaliRole')}
            onContinue={(_name, _relationship) => navigate('WaliComplete')}
          />
        );

      case 'WaliComplete':
        return (
          <WaliSetupCompleteScreen
            onGoHome={() => navigate('Home')}
            onSeeDependent={() => navigate('Home')}
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
              updateLocation(c.iso2).catch(() => {});
              navigateForward('F7');
            }}
            continueLoading={stepSaving}
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
              updateLocation(country.iso2, city, coords?.latitude, coords?.longitude).catch(() => {});
              navigateForward('F8');
            }}
            continueLoading={stepSaving}
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
              updateEssentials({
                fullName: data.name,
                gender: toGender(data.gender as 'man' | 'woman'),
                dateOfBirth: parseDob(data.dob),
                maritalStatus: toMaritalStatus(data.maritalStatus),
                occupation: data.occupation,
                educationLevel: data.educationLevel,
                heightCm: data.heightCm,
              }).catch(() => {});
              updateSect(toSect(data.sect)).catch(() => {});
              navigateForward('F10');
            }}
            continueLoading={stepSaving || undefined}
          />
        );

      // ── F10: Progress Hub ─────────────────────────────────────────────────────
      case 'F10':
        return (
          <ProgressHubScreen
            onBack={() => navigate('F8')}
            onSave={() => console.log('Save')}
            onContinue={() => navigateForward('F11')}
            continueLoading={stepSaving}
          />
        );

      // ── F11: Family & Home ────────────────────────────────────────────────────
      case 'F11':
        return (
          <FamilyAndHomeScreen
            onBack={() => navigate('F10')}
            onSave={() => console.log('Save')}
            onContinue={data => {
              updateFamilyBackground(data).catch(() => {});
              navigateForward('F12');
            }}
            continueLoading={stepSaving || undefined}
          />
        );

      // ── F12: Guided Prompt ────────────────────────────────────────────────────
      case 'F12':
        return (
          <GuidedPromptScreen
            onBack={() => navigate('F11')}
            onSave={() => console.log('Save')}
            onNext={text => {
              updateBio(text).catch(() => {});
              navigateForward('F13');
            }}
            questionIndex={1}
            totalQuestions={3}
            progress={0.72}
            continueLoading={stepSaving || undefined}
          />
        );

      // ── F13: Preferences ─────────────────────────────────────────────────────
      case 'F13':
        return (
          <PreferencesScreen
            onContinue={({ narrow, ageMin, ageMax }) => {
              setObAgeMin(ageMin);
              setObAgeMax(ageMax);
              updatePreferences(ageMin, ageMax).catch(() => {});
              navigateForward(narrow ? 'H11' : 'F14');
            }}
            onSave={() => console.log('Save')}
            continueLoading={stepSaving}
          />
        );

      // ── F14: Photos ───────────────────────────────────────────────────────────
      case 'F14':
        return (
          <PhotosScreen
            onBack={() => navigate('F13')}
            onContinue={() => navigateForward('F15')}
            continueLoading={stepSaving}
          />
        );

      // ── F15: Wali Invite ──────────────────────────────────────────────────────
      case 'F15':
        // Helper: advance the saved step to F16 in the background so that
        // on next app restart F15 is not shown again (it was already seen).
        const advancePastWali = () => {
          saveOnboardingStep('F16').catch(() => {});
          setResumeScreen('F16');
        };
        return (
          <WaliInviteScreen
            onBack={() => navigate('F14')}
            onLater={() => { advancePastWali(); navigate('F16'); }}
            onInviteWhatsApp={(name, _rel) => {
              setWaliName(name);
              advancePastWali();
              navigate('F16');
            }}
            onReadCode={(name, _rel) => {
              setWaliName(name);
              advancePastWali();
              navigate('F16');
            }}
            onSkip={() => {
              setWaliName('');
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
              saveOnboardingStep('F17').catch(() => {});
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
                // TODO: replace the empty receipt string with the real IAP receipt
                // from react-native-iap or RevenueCat before going to production.
                const result = await verifyPurchase(
                  '',
                  Platform.OS as 'ios' | 'android',
                  'mehram_membership',
                );
                if (result.isEntitled) {
                  setPaymentFailed(false);
                  setUnderReviewPaid(true);
                  saveOnboardingStep('F18').catch(() => {});
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
              saveOnboardingStep('F18').catch(() => {});
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
      // Shows H5/H3/H4/H8/H12/H16/H6 based on pending state (priority order).
      case 'Home':
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
            profileIncomplete={!onboardingComplete}
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
            onViewProposalProfile={(userId) => {
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
            onViewProfile={() => {
              if (!currentIntroductionId) return;
              setDetailProfile(undefined);
              setDetailLoading(true);
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
                getHomeStats(activeFiltersRef.current)
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
            activeTab={activeTab}
            onTabChange={tab => setActiveTab(tab)}
          />
        );

      // ── ProfileDetail: P2 ─────────────────────────────────────────────────
      case 'ProfileDetail':
        return (
          <ProfileDetailScreen
            profile={detailProfile}
            loading={detailLoading}
            onBack={() => navigate('Home')}
            onNotSuitable={() => navigate('Home')}
            onRequestPhoto={() => console.log('Request photo')}
            onSendProposal={() => console.log('Send proposal')}
          />
        );

      // ── Settings: M1 ─────────────────────────────────────────────────────
      case 'Settings':
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
            onSignOut={() => {
              clearTokens();
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
            onDeletePermanently={() => {
              clearTokens();
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
            onConfirm={() => {
              clearTokens();
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
