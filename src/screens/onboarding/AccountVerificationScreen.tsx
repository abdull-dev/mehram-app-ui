/**
 * AccountVerificationScreen
 *
 * Shown immediately after Sign Up. Two verification rows:
 *   • Phone — tapping [Verify] sends SMS OTP, then shows 6 inline boxes
 *             → auto-verifies via verifyPhoneOnly on last digit entry
 *   • Email — tapping [Verify] sends the OTP then expands inline boxes
 *             → auto-verifies via verifyEmailOtp on last digit, saves
 *             tokens, clears pendingEmail
 *
 * Continue is only active once email is verified (tokens obtained).
 * If user closes before verifying, pendingEmail stays in AsyncStorage
 * so the next launch routes back here.
 *
 * Either row can also be corrected — "Wrong number/email? Change it" reopens
 * the signup form pre-filled. Saving there records the new value and returns
 * here; the next Verify tap registers with it, which is what actually moves it.
 * Both links disappear once the email is verified; see `canEditContacts`.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  sendOtp,
  verifyPhoneOnly,
  verifyEmailOtp,
  resendEmailOtp,
} from '../../api/auth';
import { clearPendingEmail } from '../../storage/authStorage';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';

const CODE_LEN     = 6;
const RESEND_SECS  = 30;
const RISE_DUR     = 550;
const RISE_EASE    = Easing.bezier(0.2, 0.7, 0.3, 1);

/**
 * How long to let the Continue spinner paint before the work starts. Long
 * enough to read as a response to the press (a frame is 16ms), short enough not
 * to feel like an added wait.
 */
const SPINNER_PAINT_MS = 220;

// ─── small SVG icons ──────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.87a16 16 0 0 0 6.22 6.22l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
        stroke={Colors.ink3}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke={Colors.ink3}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6l-10 7L2 6"
        stroke={Colors.ink3}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="20 6 9 17 4 12"
        stroke={Colors.mint}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
  /** E.164 phone number, e.g. "+923114440959" — used for OTP API calls */
  phone: string;
  /** Human-friendly display, e.g. "+92 3114440959" — shown in the row */
  phoneDisplay: string;
  email: string;
  /**
   * Continue. May return a promise — the button shows a spinner until it
   * settles, since the parent does a round-trip (GET /auth/me) before it knows
   * which screen comes next.
   */
  onVerified: () => void | Promise<void>;
  /**
   * Re-open the signup form on the number / the address, so a typo can be
   * corrected without abandoning the signup. The parent re-submits
   * `POST /auth/register`, which is the only way either value can change before
   * the account is confirmed — nothing else on the API can move them.
   */
  /**
   * Persist a corrected number/address. Edited in place rather than by
   * reopening the signup form: the account already exists by now, so sending
   * the user back to a form that would create one is the wrong shape.
   */
  /**
   * Save the one contact detail being corrected.
   *
   * Only the edited field is sent. Passing both meant an email edit also carried
   * the phone, and an account with no number yet sent `phone: ''` — which the
   * endpoint validates as a malformed number, so correcting an email failed with
   * "phone must be in E.164 format".
   */
  onSaveContact?: (next: { email?: string; phone?: string }) => Promise<void>;
  /**
   * This number was already confirmed earlier in the session — the user left to
   * fix their email and came back. The server keys phone verification on the
   * number itself, not on the pending signup, so it is still genuinely verified
   * and asking again would spend an SMS (and a slot in the 3/min send limit) to
   * re-prove something that already holds.
   */
  phoneAlreadyVerified?: boolean;
  /**
   * This address was already confirmed, per the server. Without it the row
   * reset to an unverified "Verify" button on every remount — a reload, or the
   * parent re-rendering — even though the account was verified, because the
   * only record of it was this component's own state.
   */
  emailAlreadyVerified?: boolean;
  /**
   * The server has not answered yet. Both rows show a skeleton rather than
   * their unverified state, which would otherwise flash "Verify" and snap to
   * "Verified" a moment later — reading as a verification being lost and found.
   */
  statusLoading?: boolean;
  /** Report a confirmed number up, so a later remount can restore the above. */
  onPhoneVerified?: (e164: string) => void;
  /**
   * When the signup form registered, in epoch ms — the moment the first email
   * code was actually sent. Absent when this screen was reached by restoring a
   * pending signup, where the send is long past and unknowable.
   */
  emailCodeSentAt?: number;
  /**
   * Sign out and return to the start. The account already exists by the time
   * this screen is reached, so there is nothing to go "back" to — leaving means
   * abandoning a real session, which is a different action from navigation.
   */
  onLogout?: () => void | Promise<void>;
}

/**
 * One OTP field's worth of state. An object rather than a dozen positional
 * arguments: the two call sites pass the same shape with `phone`/`email`
 * prefixes, and a misordered pair of same-typed flags would have been silent.
 */
interface OtpFieldProps {
  digits: string[];
  focused: boolean;
  inputRef: React.RefObject<React.ComponentRef<typeof TextInput> | null>;
  onChange: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  /** Last failure, shown in place of everything else. */
  error: string | null;
  /** Confirmation that a resend went out, shown only when there is no error. */
  note: string | null;
  verifying: boolean;
  /** A resend is in flight — the link reads "Sending…" and cannot be tapped. */
  sending: boolean;
  secs: number;
  onResend: () => void;
}

export function AccountVerificationScreen({
  phone,
  phoneDisplay,
  email,
  onVerified,
  onSaveContact,
  phoneAlreadyVerified = false,
  emailAlreadyVerified = false,
  statusLoading = false,
  onPhoneVerified,
  emailCodeSentAt,
  onLogout,
}: Props) {
  const insets = useSafeAreaInsets();

  /**
   * Signing out hits the network and then unwinds a screenful of parent state,
   * so the tap is not instant. Without this the button just sits there looking
   * ignored, and a second tap fires a second logout.
   */
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!onLogout || loggingOut) return;
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      // The parent normally navigates away and this screen unmounts, but if the
      // sign-out failed we are still here and the button has to work again.
      setLoggingOut(false);
    }
  };

  // ── phone verification state ───────────────────────────────────────────────
  const [phoneExpanded, setPhoneExpanded]   = useState(false);
  const [phoneVerified, setPhoneVerified]   = useState(phoneAlreadyVerified);
  const [phoneDigits,   setPhoneDigits]     = useState<string[]>(Array(CODE_LEN).fill(''));
  const [phoneFocus,    setPhoneFocus]      = useState(false);
  const [phoneError,    setPhoneError]      = useState<string | null>(null);
  const [phoneSending,  setPhoneSending]    = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneSecs,     setPhoneSecs]       = useState(0);
  // Confirmation that a resend actually went out. Without it the only feedback
  // is the countdown restarting, which is easy to miss and says nothing about
  // whether the request succeeded.
  const [phoneNote,     setPhoneNote]       = useState<string | null>(null);
  // One input per field, not one per box: the boxes are display-only and a
  // single transparent input sits over them (see renderOtpBoxes).
  const phoneRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // ── email verification state ───────────────────────────────────────────────
  const [emailExpanded, setEmailExpanded]   = useState(false);
  const [emailVerified, setEmailVerified]   = useState(emailAlreadyVerified);
  const [emailDigits,   setEmailDigits]     = useState<string[]>(Array(CODE_LEN).fill(''));
  const [emailFocus,    setEmailFocus]      = useState(false);
  const [emailError,    setEmailError]      = useState<string | null>(null);
  const [emailSending,  setEmailSending]    = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailSecs,     setEmailSecs]       = useState(0);
  const [emailNote,     setEmailNote]       = useState<string | null>(null);
  const emailRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  /** What the mobile row shows; empty when the account has no number. */
  const phoneNumber = (phoneDisplay || phone || '').trim();

  /**
   * Both contacts must be confirmed before moving on — the screen exists to
   * prove ownership of each, and it used to let a user past on the email alone
   * with the phone still unverified.
   *
   * The phone is only required when there is one on record; an account with no
   * number has nothing to confirm, and demanding it would strand them here.
   */
  const canContinue = emailVerified && (!phoneNumber || phoneVerified);

  /**
   * Whether the number and address can still be corrected here.
   *
   * Only until the email code is accepted. That is the moment the pending
   * identity becomes a real account: `POST /auth/register` then refuses the
   * address as taken and will not rewrite a confirmed identity's metadata, so
   * offering a "Change" that could only fail would be a lie. After it, a change
   * belongs to account settings, against an authenticated session.
   */
  // Also withheld while loading: offering "Change it" beside a skeleton invites
  // an edit against state we cannot see yet.
  const canEditContacts = !emailVerified && !statusLoading;

  // ── inline contact editing ─────────────────────────────────────────────────
  const [editingField, setEditingField] = useState<'phone' | 'email' | null>(null);
  const [draft, setDraft] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  function startEdit(field: 'phone' | 'email') {
    setEditingField(field);
    setDraft(field === 'phone' ? phone : email);
    setContactError(null);
  }

  function cancelEdit() {
    setEditingField(null);
    setDraft('');
    setContactError(null);
  }

  async function saveEdit() {
    if (savingContact || !editingField) return;
    const value = draft.trim();
    if (editingField === 'phone' && !/^\+\d{8,15}$/.test(value)) {
      setContactError('Enter the full number, e.g. +923001234567.');
      return;
    }
    if (editingField === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
      setContactError('Enter a valid email address.');
      return;
    }

    setSavingContact(true);
    setContactError(null);
    try {
      await onSaveContact?.(
        editingField === 'email' ? { email: value } : { phone: value },
      );
      // Whatever was changed is no longer proven, so its code boxes and any
      // running resend timer are cleared rather than left pointing at the old
      // value.
      if (editingField === 'phone') {
        setPhoneVerified(false);
        setPhoneExpanded(false);
        setPhoneDigits(Array(CODE_LEN).fill(''));
        setPhoneSecs(0);
        setPhoneError(null);
      } else {
        setEmailVerified(false);
        setEmailExpanded(false);
        setEmailDigits(Array(CODE_LEN).fill(''));
        setEmailSecs(0);
        setEmailError(null);
      }
      setEditingField(null);
      setDraft('');
    } catch (err: any) {
      setContactError(err?.message ?? 'Could not save. Please try again.');
    } finally {
      setSavingContact(false);
    }
  }

  function renderContactEditor(field: 'phone' | 'email') {
    return (
      <View style={s.editWrap}>
        <TextInput
          style={s.editInput}
          value={draft}
          onChangeText={t => { setDraft(t); setContactError(null); }}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={field === 'phone' ? 'phone-pad' : 'email-address'}
          placeholder={field === 'phone' ? '+923001234567' : 'you@email.com'}
          placeholderTextColor={Colors.ink3}
          editable={!savingContact}
        />
        {!!contactError && <Text style={s.errText}>{contactError}</Text>}
        <View style={s.editActions}>
          <Pressable
            onPress={cancelEdit}
            disabled={savingContact}
            style={({ pressed }) => [s.editCancel, pressed && s.verifyBtnPressed]}>
            <Text style={s.editCancelLabel}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={saveEdit}
            disabled={savingContact}
            style={({ pressed }) => [s.editSave, pressed && s.verifyBtnPressed]}>
            <Text style={s.editSaveLabel}>{savingContact ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Continue is not instant: the parent fetches the profile to decide where to
  // resume. Without this the button sat inert for the length of that request
  // and the tap read as ignored.
  const [continuing, setContinuing] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  /**
   * Adopt the server's answer when it lands.
   *
   * `useState(prop)` only seeds the first render, and the truth arrives from
   * /auth/me a moment after mount — so without this the row stayed on "Verify"
   * for an address the server had already confirmed. Only ever flips a row ON:
   * a confirmation made in this session must not be undone by a stale fetch.
   */
  /**
   * Slow pulse for the loading placeholders. Runs only while they are on
   * screen, so nothing animates in the background once the answer arrives.
   */
  const skeletonPulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    if (!statusLoading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0.45,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [statusLoading, skeletonPulse]);

  useEffect(() => {
    if (emailAlreadyVerified) setEmailVerified(true);
  }, [emailAlreadyVerified]);

  useEffect(() => {
    if (phoneAlreadyVerified) setPhoneVerified(true);
  }, [phoneAlreadyVerified]);

  /**
   * A code is still being checked, so Continue is not yet possible but
   * something *is* happening.
   *
   * The last OTP digit auto-submits, so tapping Continue right after typing it
   * lands in this window: the button was simply disabled and swallowed the tap,
   * which read as the app ignoring the press and then moving on by itself a
   * moment later. Showing the spinner makes the wait legible.
   */
  const verifyingNow = emailVerifying || phoneVerifying;

  async function handleContinue() {
    if (!canContinue || continuing) return;
    setContinuing(true);
    try {
      // Yield a frame before starting the work.
      //
      // The request behind this takes single-digit milliseconds, so it used to
      // resolve and navigate inside the same frame as `setContinuing(true)` —
      // React never painted the spinner, and the press looked ignored right up
      // until the screen changed. Handing the paint a turn first is what makes
      // the button actually respond; a slow request simply keeps spinning from
      // there.
      await new Promise<void>(resolve => {
        setTimeout(resolve, SPINNER_PAINT_MS);
      });
      await onVerified();
    } finally {
      // The parent navigates away on success, so this only matters when it
      // fails and the screen stays up — the button must not stay stuck.
      if (alive.current) setContinuing(false);
    }
  }

  /**
   * Release focus when the keyboard is dismissed from outside the field.
   *
   * Tapping away hides the keyboard but leaves the input focused as far as
   * React Native is concerned. Tapping the boxes again is then not a focus
   * change, so nothing asks for the keyboard and it never comes back — the
   * field looks dead until you leave the screen. Blurring on dismiss keeps the
   * two in step, so the next tap is a real focus and the keyboard opens.
   */
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      if (phoneRef.current?.isFocused()) phoneRef.current.blur();
      if (emailRef.current?.isFocused()) emailRef.current.blur();
    });
    return () => sub.remove();
  }, []);

  // ── resend countdown timers ────────────────────────────────────────────────
  useEffect(() => {
    if (phoneSecs <= 0) return;
    const t = setTimeout(() => setPhoneSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneSecs]);

  useEffect(() => {
    if (emailSecs <= 0) return;
    const t = setTimeout(() => setEmailSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [emailSecs]);

  // ── entrance animations ────────────────────────────────────────────────────
  const aHead  = useRef(new Animated.Value(0)).current;
  const aPhone = useRef(new Animated.Value(0)).current;
  const aEmail = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const make = (anim: Animated.Value, delay: number) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DUR,
        delay,
        easing: RISE_EASE,
        useNativeDriver: true,
      });
    Animated.parallel([make(aHead, 70), make(aPhone, 150), make(aEmail, 230)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function riseStyle(anim: Animated.Value) {
    return {
      opacity: anim,
      transform: [
        {
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [15, 0],
          }),
        },
      ],
    };
  }

  // ── phone OTP helpers ──────────────────────────────────────────────────────

  async function handlePhoneTapVerify() {
    setPhoneSending(true);
    setPhoneError(null);
    try {
      await sendOtp(phone);
      setPhoneSecs(RESEND_SECS);
      setPhoneExpanded(true);
      setTimeout(() => phoneRef.current?.focus(), 120);
    } catch (err: any) {
      setPhoneError(err?.message ?? 'Failed to send code. Try again.');
    } finally {
      setPhoneSending(false);
    }
  }

  /**
   * Ask for a fresh SMS. Hits the same POST /auth/send-otp as the first send,
   * which replaces the stored code rather than re-issuing the old one — so
   * whatever arrived before this tap stops working.
   *
   * The countdown starts only once the request has resolved, and a failure now
   * surfaces instead of being swallowed. Both matter for the case this button
   * exists for: the first code never arrived. Starting the timer up front locks
   * the link for thirty seconds on a request that never reached the network,
   * and swallowing the error leaves a tap that visibly does nothing at all.
   *
   * `phoneSending` is also the double-tap guard. It is shared with the Verify
   * button, which is never on screen at the same time as this one.
   */
  async function handlePhoneResend() {
    if (phoneSecs > 0 || phoneSending) return;
    setPhoneSending(true);
    setPhoneDigits(Array(CODE_LEN).fill(''));
    setPhoneError(null);
    setPhoneNote(null);
    try {
      await sendOtp(phone);
      // Only now: the server drops a send that lands within 30s of the previous
      // one, and RESEND_SECS matches that window. Timing it from the response
      // rather than the tap keeps the client's window the wider of the two, so
      // the next resend can never fall inside the server's and be quietly
      // discarded while this screen claims a code went out.
      setPhoneSecs(RESEND_SECS);
      setPhoneNote('New code sent.');
      setTimeout(() => phoneRef.current?.focus(), 120);
    } catch (err: any) {
      setPhoneError(err?.message ?? 'Could not send a new code. Please try again.');
    } finally {
      setPhoneSending(false);
    }
  }

  // Receives the whole code, so a paste or an SMS autofill lands intact rather
  // than being reduced to its last character. Backspace needs no special case
  // now that one input owns the string.
  function handlePhoneCodeChange(text: string) {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, CODE_LEN);
    setPhoneDigits(Array.from({ length: CODE_LEN }, (_, i) => cleaned[i] ?? ''));
    setPhoneError(null);
    setPhoneNote(null);
    if (cleaned.length === CODE_LEN) {
      doVerifyPhone(cleaned);
    }
  }

  async function doVerifyPhone(code: string) {
    setPhoneVerifying(true);
    setPhoneError(null);
    try {
      await verifyPhoneOnly(phone, code);
      setPhoneVerified(true);
      setPhoneExpanded(false);
      onPhoneVerified?.(phone);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      const isUserFacing = msg && !msg.includes('AsyncStorage') && !msg.includes('null') && !msg.includes('undefined');
      setPhoneError(isUserFacing ? msg : 'Invalid or expired code. Please try again.');
      setPhoneDigits(Array(CODE_LEN).fill(''));
      setTimeout(() => phoneRef.current?.focus(), 120);
    } finally {
      setPhoneVerifying(false);
    }
  }

  // ── email OTP helpers ──────────────────────────────────────────────────────

  async function handleEmailTapVerify() {
    if (emailExpanded) return;
    // Sign-up already sent the first email OTP. Opening the boxes must not
    // resend — that was the extra code. Resend is only the timer button.
    setEmailError(null);
    // Counted from when that code was actually sent, not from this tap. The
    // person who most needs Resend is the one whose code never arrived, and
    // restarting the full window here made them wait another thirty seconds
    // after however long they had already spent looking for it. Unknown send
    // time means a restored signup, where it is long past — offer it at once.
    const sentSecsAgo = emailCodeSentAt
      ? Math.floor((Date.now() - emailCodeSentAt) / 1000)
      : RESEND_SECS;
    setEmailSecs(Math.max(0, RESEND_SECS - sentSecsAgo));
    setEmailExpanded(true);
    setTimeout(() => emailRef.current?.focus(), 120);
  }

  /**
   * Ask for a fresh email code via POST /auth/resend-verification, which is
   * Supabase's `resend({ type: 'signup' })` — a new code for the pending
   * signup, invalidating the previous one.
   *
   * Same two fixes as the phone side, and this row needed them more: it set the
   * countdown *before* awaiting, then swallowed the failure, so a resend that
   * never left the device still disabled the button for thirty seconds and
   * reported nothing.
   */
  async function handleEmailResend() {
    if (emailSecs > 0 || emailSending) return;
    setEmailSending(true);
    setEmailDigits(Array(CODE_LEN).fill(''));
    setEmailError(null);
    setEmailNote(null);
    try {
      await resendEmailOtp(email);
      setEmailSecs(RESEND_SECS);
      setEmailNote('New code sent.');
      setTimeout(() => emailRef.current?.focus(), 120);
    } catch (err: any) {
      setEmailError(err?.message ?? 'Could not send a new code. Please try again.');
    } finally {
      setEmailSending(false);
    }
  }

  function handleEmailCodeChange(text: string) {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, CODE_LEN);
    setEmailDigits(Array.from({ length: CODE_LEN }, (_, i) => cleaned[i] ?? ''));
    setEmailError(null);
    setEmailNote(null);
    if (cleaned.length === CODE_LEN) {
      doVerifyEmail(cleaned);
    }
  }

  async function doVerifyEmail(code: string) {
    setEmailVerifying(true);
    setEmailError(null);
    try {
      await verifyEmailOtp(email, code);
      await clearPendingEmail();
      setEmailVerified(true);
      setEmailExpanded(false);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      // Don't expose internal/AsyncStorage errors — show a clean message
      const isUserFacing = msg && !msg.includes('AsyncStorage') && !msg.includes('null') && !msg.includes('undefined');
      setEmailError(isUserFacing ? msg : 'Invalid or expired code. Please try again.');
      setEmailDigits(Array(CODE_LEN).fill(''));
      setTimeout(() => emailRef.current?.focus(), 120);
    } finally {
      setEmailVerifying(false);
    }
  }

  // ── OTP boxes (shared render helper) ─────────────────────────────────────

  function renderOtpBoxes({
    digits,
    focused,
    inputRef,
    onChange,
    onFocus,
    onBlur,
    error,
    note,
    verifying,
    sending,
    secs,
    onResend,
  }: OtpFieldProps) {
    const code = digits.join('');
    // The boxes only draw the code; one transparent input stretched across the
    // row owns it. Six separate inputs each capped at two characters could
    // never receive a pasted six-digit code — only its last digit survived —
    // and there was no single field for the paste menu or SMS autofill to
    // target. Same arrangement as WaliCodeEntryScreen.
    return (
      <View style={s.otpSection}>
        <View style={s.otpRow}>
          {Array.from({ length: CODE_LEN }).map((_, i) => (
            <View
              key={i}
              style={[
                s.ob,
                focused && i === Math.min(code.length, CODE_LEN - 1) && s.obFocused,
                !!error && s.obError,
              ]}>
              <Text style={s.obChar}>{digits[i]}</Text>
            </View>
          ))}
          <TextInput
            ref={inputRef}
            style={s.otpOverlay}
            value={code}
            onChangeText={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={CODE_LEN}
            caretHidden
            // Re-assert focus on every press, not only when focus actually
            // changes, so a tap always reaches the keyboard.
            onPressIn={() => inputRef.current?.focus()}
            editable={!verifying}
          />
        </View>
        {/* One status line, most urgent first: what the field is doing now,
            then why the last attempt failed, then confirmation that a fresh
            code is on its way. */}
        {verifying && <Text style={s.verifyingText}>Verifying…</Text>}
        {!verifying && !!error && <Text style={s.errText}>{error}</Text>}
        {!verifying && !error && !!note && <Text style={s.noteText}>{note}</Text>}
        <Pressable
          onPress={onResend}
          disabled={secs > 0 || sending}
          style={s.resendWrap}>
          <Text style={[s.resend, secs === 0 && !sending && s.resendActive]}>
            {sending
              ? 'Sending…'
              : secs > 0
              ? `Resend in 0:${String(secs).padStart(2, '0')}`
              : 'Resend code'}
          </Text>
        </Pressable>
      </View>
    );
  }

  /**
   * Placeholder shown in a row while the server's verification state is still
   * loading. The value itself stays visible — only the part that depends on the
   * answer (Verify button vs. Verified badge) is withheld.
   */
  function renderStatusSkeleton() {
    return (
      <Animated.View
        style={[s.skeletonPill, { opacity: skeletonPulse }]}
      />
    );
  }

  // ── phone row ──────────────────────────────────────────────────────────────
  // Prefer the formatted display value, fall back to the E.164 the API calls
  // use — on a restored session only the latter is populated.

  function renderPhoneRow() {
    if (statusLoading) {
      return (
        <View style={s.row}>
          <PhoneIcon />
          <Text style={s.rowValue} numberOfLines={1}>{phoneNumber}</Text>
          {renderStatusSkeleton()}
        </View>
      );
    }
    if (phoneVerified) {
      return (
        <View style={s.row}>
          <PhoneIcon />
          <Text style={s.rowValueVerified}>{phoneNumber}</Text>
          <View style={s.verifiedBadge}>
            <CheckIcon />
            <Text style={s.verifiedLabel}>Verified</Text>
          </View>
        </View>
      );
    }

    return (
      <>
        <View style={s.row}>
          <PhoneIcon />
          <Text style={s.rowValue}>{phoneNumber}</Text>
          {!phoneExpanded && (
            <Pressable
              onPress={handlePhoneTapVerify}
              disabled={phoneSending}
              style={({ pressed }) => [s.verifyBtn, pressed && s.verifyBtnPressed]}>
              <Text style={s.verifyBtnLabel}>
                {phoneSending ? '…' : 'Verify'}
              </Text>
            </Pressable>
          )}
        </View>
        {phoneExpanded &&
          renderOtpBoxes({
            digits: phoneDigits,
            focused: phoneFocus,
            inputRef: phoneRef,
            onChange: handlePhoneCodeChange,
            onFocus: () => setPhoneFocus(true),
            onBlur: () => setPhoneFocus(false),
            error: phoneError,
            note: phoneNote,
            verifying: phoneVerifying,
            sending: phoneSending,
            secs: phoneSecs,
            onResend: handlePhoneResend,
          })
        }
        {!phoneExpanded && !!phoneError && (
          <Text style={s.errText}>{phoneError}</Text>
        )}
      </>
    );
  }

  // ── email row ──────────────────────────────────────────────────────────────

  function renderEmailRow() {
    if (statusLoading) {
      return (
        <View style={s.row}>
          <MailIcon />
          <Text style={s.rowValue} numberOfLines={1}>{email}</Text>
          {renderStatusSkeleton()}
        </View>
      );
    }
    if (emailVerified) {
      return (
        <View style={s.row}>
          <MailIcon />
          <Text style={s.rowValueVerified} numberOfLines={1}>{email}</Text>
          <View style={s.verifiedBadge}>
            <CheckIcon />
            <Text style={s.verifiedLabel}>Verified</Text>
          </View>
        </View>
      );
    }

    return (
      <>
        <View style={s.row}>
          <MailIcon />
          <Text style={s.rowValue} numberOfLines={1}>{email}</Text>
          {!emailExpanded && (
            <Pressable
              onPress={handleEmailTapVerify}
              disabled={emailSending}
              style={({ pressed }) => [s.verifyBtn, pressed && s.verifyBtnPressed]}>
              <Text style={s.verifyBtnLabel}>{emailSending ? '…' : 'Verify'}</Text>
            </Pressable>
          )}
        </View>
        {!emailExpanded && !!emailError && (
          <Text style={s.errText}>{emailError}</Text>
        )}
        {emailExpanded &&
          renderOtpBoxes({
            digits: emailDigits,
            focused: emailFocus,
            inputRef: emailRef,
            onChange: handleEmailCodeChange,
            onFocus: () => setEmailFocus(true),
            onBlur: () => setEmailFocus(false),
            error: emailError,
            note: emailNote,
            verifying: emailVerifying,
            sending: emailSending,
            secs: emailSecs,
            onResend: handleEmailResend,
          })
        }
      </>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />
      <View
        style={[
          s.screen,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>

        {/* Navbar — no back control on purpose: the account already exists by
            the time this screen shows, so retreating into the signup form would
            leave a real account sitting behind an editable form. Leaving is an
            explicit sign-out instead. */}
        <View style={s.navbar}>
          <View style={s.prgTrack}>
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[s.prgFill, { width: '12%' }]}
            />
          </View>
          {!!onLogout && (
            <Pressable
              onPress={handleLogout}
              disabled={loggingOut}
              hitSlop={10}
              style={({ pressed }) => [s.logoutBtn, pressed && s.logoutBtnPressed]}>
              <Text style={[s.logoutLabel, loggingOut && s.logoutLabelHidden]}>
                Log out
              </Text>
              {loggingOut && (
                <View style={s.logoutSpinner} pointerEvents="none">
                  <ActivityIndicator size="small" color={Colors.ink3} />
                </View>
              )}
            </Pressable>
          )}
        </View>

        {/* Body */}
        <View style={s.body}>
          <Animated.View style={[s.q, riseStyle(aHead)]}
            needsOffscreenAlphaCompositing>
            <Text style={s.heading}>Verify your{'\n'}accounts</Text>
            <Text style={s.subtitle}>
              Tap Verify next to each item below to confirm ownership.
            </Text>
          </Animated.View>

          {/* Phone card — omitted when the account has no number on record.
              An empty row beside a "Verify" button reads as a bug, and there is
              nothing for that button to send a code to. Progress does not depend
              on it: Continue is gated on the email only. */}
          {!!phoneNumber && (
            <Animated.View style={[s.card, riseStyle(aPhone)]}
              needsOffscreenAlphaCompositing>
              <Text style={s.cardLabel}>Mobile number</Text>

              {editingField !== 'phone' && renderPhoneRow()}

              {editingField === 'phone'
                ? renderContactEditor('phone')
                : canEditContacts && !!onSaveContact && (
                    <Pressable
                      onPress={() => startEdit('phone')}
                      hitSlop={6}
                      style={({ pressed }) => [s.changeWrap, pressed && s.changePressed]}>
                      <Text style={s.changeLink}>Wrong number? Change it</Text>
                    </Pressable>
                  )}
            </Animated.View>
          )}

          {/* Email card */}
          <Animated.View style={[s.card, riseStyle(aEmail)]}
            needsOffscreenAlphaCompositing>
            <Text style={s.cardLabel}>Email address</Text>
            {editingField !== 'email' && renderEmailRow()}

            {editingField === 'email'
              ? renderContactEditor('email')
              : canEditContacts && !!onSaveContact && (
                  <Pressable
                    onPress={() => startEdit('email')}
                    hitSlop={6}
                    style={({ pressed }) => [s.changeWrap, pressed && s.changePressed]}>
                    <Text style={s.changeLink}>Wrong email? Change it</Text>
                  </Pressable>
                )}
          </Animated.View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <GradientButton
            label="Continue"
            variant={canContinue ? 'primary' : 'disabled'}
            loading={continuing || verifyingNow}
            onPress={canContinue ? handleContinue : undefined}
          />
        </View>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.page, overflow: 'hidden' },
  screen:  { flex: 1, paddingHorizontal: 16, flexDirection: 'column' },

  // ── navbar ──
  navbar:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 4, flexShrink: 0 },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexShrink: 0,
  },
  logoutBtnPressed: { opacity: 0.65 },
  logoutLabel: { fontSize: 12, fontWeight: '800', color: Colors.ink3 },
  logoutLabelHidden: { opacity: 0 },
  logoutSpinner: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: '#3C2878', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  prgTrack: { flex: 1, height: 7, borderRadius: 5, backgroundColor: 'rgba(155,123,240,0.16)', overflow: 'hidden' },
  prgFill:  { height: '100%', borderRadius: 5 },

  // ── heading ──
  body:      { flex: 1 },
  q:         { paddingTop: 18, paddingHorizontal: 2, paddingBottom: 4 },
  heading:   { fontSize: 24, fontWeight: '800', letterSpacing: -0.7, lineHeight: 29, color: Colors.ink },
  subtitle:  { fontSize: 13, color: Colors.ink2, marginTop: 8, lineHeight: 20 },

  // ── cards ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.ink3,
    marginBottom: 10,
  },

  // ── row ──
  row:            { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowValue:       { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.ink },
  rowValueVerified: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.mintInk },

  // ── verify button ──
  verifyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.vioSoft,
    flexShrink: 0,
  },
  verifyBtnPressed: { opacity: 0.65 },
  verifyBtnLoading: { opacity: 0.5 },
  verifyBtnLabel: { fontSize: 12.5, fontWeight: '800', color: Colors.vioD },

  // Sized to match the Verify button / Verified badge it stands in for, so the
  // row does not resize when the real control replaces it.
  skeletonPill: {
    width: 76,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(120,110,150,0.16)',
    flexShrink: 0,
  },

  // ── verified badge ──
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: Colors.mintSoft,
    flexShrink: 0,
  },
  verifiedLabel: { fontSize: 12, fontWeight: '800', color: Colors.mintInk },

  // ── OTP boxes ──
  otpSection: { marginTop: 14 },
  otpRow:     { flexDirection: 'row', gap: 8 },
  ob: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.page,
    borderWidth: 1.5,
    borderColor: 'rgba(155,123,240,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    // iOS counterpart to `elevation`, which Android alone honours. Without it
    // the box had a subtle lift on Android and sat flat on iOS.
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  obChar: { fontSize: 20, fontWeight: '800', color: Colors.ink },
  // Invisible, but a real input: it covers the whole row so a tap anywhere
  // focuses it and the paste menu has something to attach to.
  otpOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 },
  obFocused: { borderColor: Colors.vio, shadowColor: Colors.vio, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3 },
  obError:   { borderColor: '#D9304F', backgroundColor: '#FFF4F8' },
  errText:      { fontSize: 12, fontWeight: '700', color: '#D9304F', marginTop: 6 },
  verifyingText: { fontSize: 12, color: Colors.ink3, marginTop: 6, fontStyle: 'italic' },
  noteText:      { fontSize: 12, fontWeight: '700', color: Colors.mintInk, marginTop: 6 },


  // ── change contact ──
  // Divided off from the row above so it reads as an escape hatch rather than
  // a second action competing with Verify.
  editWrap: { marginTop: 12, gap: 10 },
  editInput: {
    borderWidth: 1.5,
    borderColor: Colors.vioSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ink,
    backgroundColor: '#FFF',
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  editCancel: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  editCancelLabel: { fontSize: 12.5, fontWeight: '800', color: Colors.ink3 },
  editSave: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.vioSoft,
  },
  editSaveLabel: { fontSize: 12.5, fontWeight: '800', color: Colors.vioD },

  changeWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    alignSelf: 'stretch',
  },
  changePressed: { opacity: 0.6 },
  changeLink: { fontSize: 12.5, fontWeight: '700', color: Colors.vioD },

  // ── resend ──
  resendWrap:  { marginTop: 8, alignSelf: 'flex-start' },
  resend:      { fontSize: 12, color: Colors.ink3 },
  resendActive:{ color: Colors.vioD, fontWeight: '700' },

  // ── footer ──
  footer:    { paddingTop: 12, flexShrink: 0 },
});
